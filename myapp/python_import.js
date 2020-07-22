Blockly.Python['import'] = function(block) {
  var value_library_name = Blockly.Python.valueToCode(block, 'library_NAME', Blockly.Python.ORDER_ATOMIC);
  // TODO: Assemble Python into code variable.
  var code = 'import '+ value_library_name + '\n';
  return code;
};