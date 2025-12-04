<?php
if($_SERVER["REQUEST_METHOD"]=="POST"){

    $totalCost = ($_POST["mode"]=="study")
        ? ($_POST["pax"] * 50 * ((strtotime($_POST["end"])-strtotime($_POST["start"])) / 3600))
        : (1000 * ((strtotime($_POST["end"])-strtotime($_POST["start"])) / 3600));

    header("Location: summary.html");
    exit;
}
?>
