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

/*        var data = google.visualization.arrayToDataTable([
          ['Label', 'Value'],
          ['T Eau', 80],
          ['T Air', 55],
          ["Water Lvl", 68]
        ]);
 */
        var tEau = google.visualization.arrayToDataTable([
          ['Label', 'Value'],
          ['T Eau', <?php echo $temp_eau; ?> ],
          ]);


        var options_tEau = {
          width: 400, height: 420,
          redFrom: 30, redTo: 50,
          yellowFrom:22, yellowTo: 30,
          greenFrom: 18, greenTo: 22,
          max: 50,
          minorTicks: 5
        };

        var tAir = google.visualization.arrayToDataTable([
          ['Label', 'Value'],
          ['T Air', <?php echo $temp_air; ?> ],
          ]);


        var options_tAir = {
          width: 400, height: 420,
          redFrom: 30, redTo: 50,
          yellowFrom:22, yellowTo: 30,
          greenFrom: 18, greenTo: 22,
          minorTicks: 5
        };
       


        var chart = new google.visualization.Gauge(document.getElementById('chart_eau'));

        chart.draw(tEau, options_tEau);

        var chart = new google.visualization.Gauge(document.getElementById('chart_air'));

        chart.draw(tAir, options_tAir);


/*
        setInterval(function() {
          data.setValue(0, 1, 40 + Math.round(60 * Math.random()));
          chart.draw(data, options);
        }, 13000);
        setInterval(function() {
          data.setValue(1, 1, 40 + Math.round(60 * Math.random()));
          chart.draw(data, options);
        }, 5000);
        setInterval(function() {
          data.setValue(2, 1, 60 + Math.round(20 * Math.random()));
          chart.draw(data, options);
      }, 26000);
 */
      }
    </script>
  </head>
  <body>
    <div id="chart_eau" style="width: 1201px; height: 120px; float: left"></div> <p> yo </p>
<!-- <div id="chart_air" style="width: 1201px; height: 120px; float: left"></div> -->
  </body>
</html>
