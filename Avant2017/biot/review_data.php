<?php 
	// Start MySQL Connection
	include('dbconnect.php'); 
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
</head>

    <body>
        <h1>Jardin bIoT Log</h1>
<p>Voici les premiers pas du projet de visualisation, controle et monitoring du jardin BIoT. </p>
<p>Un jardin branche</p>

<?php 

        $sql = "SELECT * FROM temperatures ORDER BY id DESC LIMIT 25";
        $result_temp = mysqli_query($dbh,$sql);

        $sql = "SELECT * FROM event ORDER BY id DESC LIMIT 25";
        $result_event = mysqli_query($dbh,$sql);


        $min_value_q = "select min( value ) AS minT, max( value ) AS maxT from temperatures where `sensor` = 'TempEau' AND `timestamp` >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        $min_result = mysqli_query($dbh,$min_value_q);
        	while( $row = mysqli_fetch_array($min_result) )
                { 
                  $minTemp = $row['minT'];
                  $maxTemp = $row['maxT'];
                  echo "-> La temperature la plus haute de l'eau (des dernier 24hrs) ; ".$maxTemp."<br />";
                  echo "-> La Temperature la plus basse de l'eau (des dernier 24hrs) ; ".$minTemp."<br />";
                }

        
        $min_value_q = "select min( value ) AS minT, max( value ) AS maxT from temperatures where `sensor` = 'TempAir' AND `timestamp` >= DATE_SUB(NOW(), INTERVAL 1 DAY) ";
        $min_result = mysqli_query($dbh,$min_value_q);
        	while( $row = mysqli_fetch_array($min_result) )
                { $minTemp = $row['minT'];   echo "-> La Temperature la plus basse de l'air (des dernier 24hrs) ; ".$minTemp."<br />";
                $maxTemp = $row['maxT'];   echo "-> La temperature la plus haute de l'air (des dernier 24hrs) ; ".$maxTemp."<br />"; }

     /*   $max_value_q = "select max( value ) AS maxT from temperatures where `sensor` = 'TempAir' AND `timestamp` >= DATE_SUB(NOW(), INTERVAL 1 DAY) ";
        $min_result = mysqli_query($dbh,$max_value_q);
        	while( $row = mysqli_fetch_array($min_result) )
                { $maxTemp = $row['maxT'];   echo "La temperature la plus haute de l'air ; ".$maxTemp."<br />"; }
      */

?>

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
