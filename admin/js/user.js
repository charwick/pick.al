"use strict";
document.addEventListener('DOMContentLoaded', () => {
    function fieldData(inputs) { return ['req=edituser', 'k='+inputs[0].name, 'v='+inputs[0].value] }
    makeEditable(document.getElementById('email'), {placeholder: 'Email Address', request: 'edituser', data: fieldData});
});