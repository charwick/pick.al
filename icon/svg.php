<?php // Allows dynamically modifying SVG colors since we're not embedding them in the HTML, so they're inaccessible by CSS.

header('Content-Type: image/svg+xml');
$svg = file_get_contents($_GET['icon'].'.svg');
if (isset($_GET['color'])) $svg = str_replace('currentColor', '#'.$_GET['color'], $svg);
print($svg);