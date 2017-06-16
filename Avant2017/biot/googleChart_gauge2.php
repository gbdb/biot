<?php 

include('dbconnect.php');

$sql_eau = "SELECT value FROM temperatures where `sensor` = 'TempEau' ORDER BY id DESC LIMIT 1";
$result_eau = mysqli_query($dbh,$sql_eau);
while( $eau = mysqli_fetch_array($result_eau) )
{ $temp_eau = $eau['value']; }

$sql_air = "SELECT value FROM temperatures where `sensor` = 'TempAir' ORDER BY id DESC LIMIT 1";
$result_air = mysqli_query($dbh,$sql_air);
while( $air = mysqli_fetch_array($result_air) )
{ $temp_air = $air['value']; }


?>

<html>
  <head>
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
      google.load("visualization", "1", {packages:["gauge"]});
      google.setOnLoadCallback(drawChart);
      function drawChart() {

        var data = google.visualization.arrayToDataTable([
          ['Label', 'Value'],
          ['T Eau', <?php echo $temp_eau; ?> ],
          ['T Air', <?php echo $temp_air; ?>],

          
        ]);
 
 var options = {
          width: 400, height: 120,
          redFrom: 90, redTo: 100,
          yellowFrom:75, yellowTo: 90,
          minorTicks: 5
        };


        var chart = new google.visualization.Gauge(document.getElementById('chart_eau'));

        chart.draw(data, options);


      }
    </script>
  </head>
  <body>
    <div id="chart_eau" style="width: 400px; height: 120px;"></div>
<!-- <div id="chart_air" style="width: 1201px; height: 120px; float: left"></div> -->
  </body>
</html>

