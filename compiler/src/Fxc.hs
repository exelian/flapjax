-- Command-line based Flapjax compiler.  Run without any options for usage
-- information.
module Main where

import Control.Monad
import qualified Data.List as L
import System.Exit
import System.IO
import System.Console.GetOpt
import System.Environment hiding (withArgs)
import System.Directory
import BrownPLT.Html (renderHtml)
import Text.PrettyPrint.HughesPJ
import Text.ParserCombinators.Parsec(ParseError,parseFromFile)
import Flapjax.HtmlEmbedding()
import Flapjax.Parser(parseScript) -- for standalone mode
import BrownPLT.Html.PermissiveParser (parseHtmlFromString)
import Flapjax.Compiler(compilePage,defaults,CompilerOpts(..))

import BrownPLT.Flapjax.CompilerMessage
import BrownPLT.Flapjax.Interface

import Text.XHtml (showHtml,toHtml,HTML)

data Option
  = Usage
  | Flapjax String
  | Stdin
  | Output String
  | Stdout
  | WebMode
  deriving (Eq,Ord)

options:: [OptDescr Option]
options =
 [ Option ['h'] ["help"] (NoArg Usage) "shows this help message"
 , Option ['f'] ["flapjax-path"] (ReqArg Flapjax "URL") "url of flapjax.js"
 , Option ['o'] ["output"] (ReqArg Output "FILE") "output path"
 , Option [] ["stdout"] (NoArg Stdout) "write to standard output"
 , Option [] ["stdin"] (NoArg Stdin) "read from standard input"
 , Option [] ["web-mode"] (NoArg WebMode) "web-compiler mode"
 ]

checkUsage (Usage:_) = do
  putStrLn "Flapjax Compiler (fxc-2.0)"
  putStrLn (usageInfo "Usage: fxc [OPTION ...] file" options)
  exitSuccess
checkUsage _ = return ()
  
getFlapjaxPath :: [Option] -> IO (String,[Option])
getFlapjaxPath ((Flapjax s):rest) = return (s,rest)
getFlapjaxPath rest = do
  s <- getInstalledFlapjaxPath
  return ("file://" ++ s,rest)

getInput :: [String] -> [Option] -> IO (Handle,String,[Option])
getInput [] (Stdin:rest) = return (stdin,"stdin",rest)
getInput [path] options = do
  h <- openFile path ReadMode
  return (h,path,options)
getInput [] _ = do
  hPutStrLn stderr "neither --stdin nor an input file was specified"
  exitFailure
getInput (_:_) _ = do
  hPutStrLn stderr "multiple input files specified"
  exitFailure

getOutput :: String -> [Option] -> IO (Handle,[Option])
getOutput _ (Stdout:rest) = return (stdout,rest)
getOutput _ ((Output outputName):rest) = do
  h <- openFile outputName WriteMode
  return (h,rest)
getOutput inputName options = do
  h <- openFile (inputName ++ ".html") WriteMode
  return (h,options)

getWebMode :: [Option] -> IO (Bool,[Option])
getWebMode (WebMode:rest) = return (True,rest)
getWebMode options = return (False,options)

main = do
  argv <- getArgs
  let (permutedArgs,files,errors) = getOpt Permute options argv
  unless (null errors) $ do
    mapM_ (hPutStrLn stderr) errors
    exitFailure
  let args = L.sort permutedArgs
  checkUsage args

  (fxPath,args) <- getFlapjaxPath args
  (inputHandle,inputName,args) <- getInput files args
  (outputHandle,args) <- getOutput inputName args
  (isWebMode,args) <- getWebMode args

  unless (null args) $ do
    hPutStrLn stderr "invalid arguments, use -h for help"
    exitFailure

  -- monomorphism restriction, I think
  let showErr :: (Show a, HTML a) => a -> String
      showErr = if isWebMode then showHtml.toHtml else show

  inputText <- hGetContents inputHandle
  case parseHtmlFromString inputName inputText of
    Left err -> do -- TODO: web mode is different
      hPutStrLn stderr (showErr err)
      exitFailure
    Right (html,_) -> do -- ignoring all warnings
      (msgs,outHtml) <- compilePage (defaults { flapjaxPath = fxPath })  html
      
      -- TODO: web mode is different
      mapM_ (hPutStrLn stderr . showErr) msgs

      hPutStrLn outputHandle (renderHtml outHtml)
      hClose outputHandle
      exitSuccess
