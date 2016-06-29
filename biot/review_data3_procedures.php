<?php 
	// Start MySQL Connection
include('dbconnect.php'); 
  $sql = "SELECT * FROM temperatures ORDER BY id DESC LIMIT 25";
        $result_temp = mysqli_query($dbh,$sql);

        $sql = "SELECT * FROM event ORDER BY id DESC LIMIT 25";
        $result_event = mysqli_query($dbh,$sql);


        $min_value_q = "select min( value ) AS minT, max( value ) AS maxT from temperatures where `sensor` = 'TempEau' AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        $min_result = mysqli_query($dbh,$min_value_q);

        	while( $row = mysqli_fetch_array($min_result) )
                { 
                  $minTemp_eau = $row['minT'];
                  $maxTemp_eau = $row['maxT'];
                 
                }

        
        $min_value_q = "select min( value ) AS minT, max( value ) AS maxT from temperatures where `sensor` = 'TempAir' AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY) ";
        $min_result = mysqli_query($dbh,$min_value_q);
        	while( $row = mysqli_fetch_array($min_result) )
                { $minTemp_air = $row['minT'];  
                $maxTemp_air = $row['maxT'];   }


          $currentT_value_q = "select value from temperatures where `sensor` = 'TempEau' ORDER BY id DESC limit 1  ";
        $curr_result = mysqli_query($dbh,$currentT_value_q);
        	while( $row = mysqli_fetch_array($curr_result) )
                { $currTempEau = $row['value']; }                

                          $currentA_value_q = "select value from temperatures where `sensor` = 'TempAir' ORDER BY id DESC limit 1  ";
        $curr_result = mysqli_query($dbh,$currentA_value_q);
        	while( $row = mysqli_fetch_array($curr_result) )
                { $currTempAir = $row['value']; }   

        $min_value_q = "select min( value ) AS minHum, max( value ) AS maxHum from temperatures where `sensor` = 'TempHumid' AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY) ";
        $hum_result = mysqli_query($dbh,$min_value_q);
        	while( $row = mysqli_fetch_array($hum_result) )
                { $minHum = $row['minHum'];  
                $maxHum = $row['maxHum'];   }

                                            $currentA_value_q = "select value from temperatures where `sensor` = 'TempHumid' ORDER BY id DESC limit 1  ";
        $curr_result = mysqli_query($dbh,$currentA_value_q);
        	while( $row = mysqli_fetch_array($curr_result) )
                { $currHumAir = $row['value']; }   

?>

<html>
<head>
	<title>Jardin bIoT Temperature Log</title>
        <style type="text/css">
.box {
vertical-align: top;
  display: inline-block;
/*  width: 800px; */
  /*margin: 1em; */
}

        .table_titles, .table_cells_odd, .table_cells_even {
                padding-right: 5px;
                padding-left: 5px;
                color: #000;
        }
        .table_titles {
            color: #FFF;
            background-color: #666;
        }
        .table_cells_odd {
            background-color: #CCC;
        }
        .table_cells_even {
            background-color: #FAFAFA;
        }
        table {
            border: 2px solid #333;
        }

        body { font-family: "Trebuchet MS", Arial; }
    </style>
 <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
      google.load("visualization", "1", {packages:["gauge"]});
      google.setOnLoadCallback(drawChart);
      function drawChart() {

        var data = google.visualization.arrayToDataTable([
          ['Label', 'Value'],
          ['T Eau', <?php echo $currTempEau; ?> ],
          ['T Air', <?php echo $currTempAir; ?>],
          ['Humr', <?php echo $currHumAir; ?>],
          //$currHumAir
        ]);
 
 var options = {
          width: 600, height: 160,
          redFrom: 30, redTo: 50,
          yellowFrom:25, yellowTo: 30,
          greenFrom:18, greenTo: 25,
          minorTicks: 5, max: 50,
        };


        var chart = new google.visualization.Gauge(document.getElementById('chart_eau'));

        chart.draw(data, options);


      }
    </script>

</head>

    <body>
       <h1>Jardin bIoT Log</h1>
<h2>Un jardin branche</h2>
<p>Voici les premiers pas du projet de visualisation, controle et monitoring du jardin BIoT. </p>


<?php 
                  echo "-> La temperature la plus haute de l'eau (des dernier 24hrs) ; ".$maxTemp_eau."<br />";
                echo "-> La Temperature la plus basse de l'eau (des dernier 24hrs) ; ".$minTemp_eau."<br />";
                echo "-> La Temperature la plus basse de l'air (des dernier 24hrs) ; ".$minTemp_air."<br />";
                echo "-> La temperature la plus haute de l'air (des dernier 24hrs) ; ".$maxTemp_air."<br />";
                echo "-> Lhumiditer la plus basse de l'air (des dernier 24hrs) ; ".$minHum."<br />";
                echo "-> Lhumiditer la plus haute de l'air (des dernier 24hrs) ; ".$maxHum."<br />";

      
        

?>
<h3>Les temperatures live; </h3>
<div id="chart_eau" style="width: 600px; height: 160px;"></div>

<h3>Les log de temperatures; </h3>
<div class="box" >
    <table border="0" cellspacing="0" cellpadding="4">
      <tr>
            <td class="table_titles">ID</td>
            <td class="table_titles">Date and Time</td>
            <td class="table_titles">Nom du Thermometre</td>
            <td class="table_titles">Temperature en Celsius</td>
          </tr>
<?php
       	// Used for row color toggle
	$oddrow = true;
	
                // process every record
        reset($result_temp);
	while( $row = mysqli_fetch_array($result_temp) )
	{
		if ($oddrow) 
		{ 
			$css_class=' class="table_cells_odd"'; 
		}
		else
		{ 
			$css_class=' class="table_cells_even"'; 
		}
		
		$oddrow = !$oddrow;
		
		echo '<tr>';
		echo '   <td'.$css_class.'>'.$row["id"].'</td>';
		echo '   <td'.$css_class.'>'.$row["timestamp"].'</td>';
		echo '   <td'.$css_class.'>'.$row["sensor"].'</td>';
		echo '   <td'.$css_class.'>'.$row["value"].'</td>';
		echo '</tr>';
	}
?>
    </table>
</div>

<div class="box" >
    <table border="0" cellspacing="0" cellpadding="4">
      <tr>
            <td class="table_titles">ID</td>
            <td class="table_titles">Date and Time</td>
            <td class="table_titles">What</td>
            <td class="table_titles">Event</td>
            <td class="table_titles">Reason</td>
          </tr>
<?php
       	// Used for row color toggle
	$oddrow = true;
	
	// process every record
	while( $row = mysqli_fetch_array($result_event) )
	{
		if ($oddrow) 
		{ $css_class=' class="table_cells_odd"'; } else
		{ $css_class=' class="table_cells_even"'; }
		
		$oddrow = !$oddrow;
		
		echo '<tr>';
		echo '   <td'.$css_class.'>'.$row["id"].'</td>';
                echo '   <td'.$css_class.'>'.$row["time"].'</td>';
                echo '   <td'.$css_class.'>'.$row["what"].'</td>';
		echo '   <td'.$css_class.'>'.$row["event"].'</td>';
		echo '   <td'.$css_class.'>'.$row["reason"].'</td>';
		echo '</tr>';
	}
?>
    </table>
</div>



    </body>
</html>
