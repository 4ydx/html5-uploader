<?php
$home  = $_SERVER['DOCUMENT_ROOT']; 
$home  = preg_replace("/demo.4ydx.com/", '', $home);
$index = $_SERVER['HTTP_X_ID'];
file_put_contents($home.'uploads/'.$index, file_get_contents("php://input"));
header("X-ID: {$_SERVER['HTTP_X_ID']}");
header("X-INDEX: {$_SERVER['HTTP_X_DISPLAY_INDEX']}");
header("X-FILE-SIZE: {$_SERVER['HTTP_X_FILE_SIZE']}");
header("X-FILE-NAME: {$_SERVER['HTTP_X_FILE_NAME']}");
echo '{ "status" : "OK", '.
  '"id"    : "'.$_SERVER['HTTP_X_ID'].'", '.
  '"index" : "'.$_SERVER['HTTP_X_INDEX'].
  '" }';
?>
