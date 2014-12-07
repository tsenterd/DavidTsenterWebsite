<?php
$email = $_POST['email'] ;
$subject = $_POST['subject'] ;
$message = $_POST['message'] ;
mail("tsenterd@gmail.com", $subject,
$message, "From:" . $email);
echo "Thank you for using our mail form";
?>