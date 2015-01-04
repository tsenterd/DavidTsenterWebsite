<?php
require_once('PHPmailer/class.phpmailer.php');
require 'PHPmailer/PHPMailerAutoload.php';
//include("class.smtp.php"); // optional, gets called from within class.phpmailer.php if not already loaded
define('GUSER', 'davidtsenter@gmail.com'); // GMail username
define('GPWD', 'DTlca97!'); // GMail password
if($_SERVER['REQUEST_METHOD'] == 'POST') {
global $error;
	$mail = new PHPMailer();  // create a new object
	$mail->IsSMTP(); // enable SMTP
	$mail->SMTPDebug = 0;  // debugging: 1 = errors and messages, 2 = messages only
	
	//READ IN DATA
	$name = ($_POST["name"]);
if (!preg_match("/^[a-zA-Z ]*$/",$name)) {
  $nameErr = "Only letters and white space allowed";
print ($nameErr);  
echo '<br />';
  echo '<button onclick="history.go(-1);">Back </button>';
  return false;
}
$email = $_POST["email"];
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  $emailErr = "Invalid email format"; 
  print ($emailErr);
echo '<br />';
   echo '<button onclick="history.go(-1);">Back </button>';
  return false;
}
	
	$mail->SMTPAuth = true;  // authentication enabled
	$mail->SMTPSecure = 'ssl'; // secure transfer enabled REQUIRED for GMail
	$mail->Host = 'smtp.gmail.com';
	$mail->Port = 465; 
	$mail->Username = GUSER;  
	$mail->Password = GPWD;           
	$mail->SetFrom($email, $name);
	$mail->Subject = $_POST['subject'];
	$mail->Body = $_POST['message']."\nFROM: ".$_POST['email'];
	$mail->AddAddress("tsenterd@gmail.com");
	if(!$mail->Send()) {
		$error = 'Mail error: '.$mail->ErrorInfo; 
		return false;
	} else {
		$error = 'Message sent!';
		print ("Thank you! Your message has been sent!");
		echo '<br />';
		 echo '<button onclick="history.go(-1);">Back </button>';
		return true;
	}
}
?>
