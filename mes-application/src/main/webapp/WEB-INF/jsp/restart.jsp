<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
<%@ taglib prefix="spring" uri="http://www.springframework.org/tags" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jstl/core_rt" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<%@ taglib uri="http://tiles.apache.org/tags-tiles" prefix="tiles" %>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">

<html>
<head>

	<script type="text/javascript" src="js/lib/jquery-1.4.2.min.js"></script>

	<script type="text/javascript">

		jQuery(document).ready(function(){
			$.ajax({
<<<<<<< HEAD
				url: "handleRestart.html",
=======
				url: "handleRestart",
>>>>>>> 6470d7732935a7b6d415a1134c7d2c9582231da7
				type: 'POST',
				complete: function(XMLHttpRequest, textStatus) {
				setTimeout("checkStatus();",5000);
				}
			});
		});

		function checkStatus() {
			$.ajax({
				url: "restart.html",
				type: 'GET',
				complete: function(XMLHttpRequest, textStatus) {
					if (XMLHttpRequest.status == 200) {
<<<<<<< HEAD
						window.location = "page/plugins.pluginGridView.html?iframe=true";
=======
						window.location = "install.html";
>>>>>>> 6470d7732935a7b6d415a1134c7d2c9582231da7
						return;
					} else {
						setTimeout("checkStatus();",1000);
					}
				}
			});
		}

	</script>

</head>
<body>

	System is restarting...

</body>
</html>