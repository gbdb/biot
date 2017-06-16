<?php
// Connect to MySQL
include("dbconnect.php");


//string $sensor;
//float $temperature; 

if(isset($_GET["sensor"])) { $sensor = $_GET["sensor"]; } else {  $sensor = "-1"; }
if(isset($_GET["temperature"])) { $temperature = $_GET["temperature"]; } else {  $temperature = "-1"; }
$sql = "INSERT INTO biot.temperatures (sensor ,value) VALUES ('".$sensor."', '".$temperature."')";     
mysqli_query($dbh,$sql);
// Go to the review_data.php (optional)
header("Location: review_data.php");

?>
