<?php
// Connect to MySQL
include("dbconnect.php");


//string $sensor;
//float $temperature; 

if(isset($_GET["what"])) { $what = $dbh->real_escape_string($_GET["what"]); } else {  $what = "-1"; }
if(isset($_GET["event"])) { $event = $dbh->real_escape_string($_GET["event"]); } else {  $event = "-1"; }
if(isset($_GET["reason"])) { $reason = $dbh->real_escape_string($_GET["reason"]); } else {  $reason = "-1"; }


$sql = "INSERT INTO biot.event (what , event, reason) VALUES ('".$what."', '".$event."', '".$reason."')";     
mysqli_query($dbh,$sql);
// Go to the review_data.php (optional)
// header("Location: review_data.php");

?>
