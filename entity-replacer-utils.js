const formatUtilsJH = require('jhipster-core/lib/utils/format_utils.js');
const path = require('path');
const chalk = require('chalk');

module.exports = {
    applyModificationsToFile
};

function applyModificationsToFile(fullPath, generator) {
		// al variables declared without `var` need to be available outside this module
		
		currentEntityReplacerGenerator =  generator;
		// @ApiModelProperty("This is a comment bla bla. <jhipster-entity-replacer> // aici avem cod js pe care... </jhipster-entity-replacer>")  becomes @ApiModelProperty("This is a comment bla bla.") 
		var regexApiModelProp = '((?:@ApiModelProperty|@ApiModel)\\(.*?)<jhipster-entity-replacer>.*<\\/jhipster-entity-replacer>(.*?\\))';
		generator.replaceContent(fullPath, regexApiModelProp, "$1$2", true);
		
		var javaText = generator.fs.read(fullPath);
		// match the whole text between <jhipster-entity-replacer> tags
		var re = new RegExp('<jhipster-entity-replacer>([\\s\\S]*?)<\\/jhipster-entity-replacer>[\\s\\S]*?(?:(.*class[\\s\\S]*?\\{)|.*?(\\w+);)', 'g');
		// iterate through whole file and get the instructions string between <jhipster-entity-replacer> for each field 
		do {
		var m = re.exec(javaText);
		if (m) {
			currentFieldOrClass = m[2] ? m[2] : m[3];
			var currentInstructionsString = m[1];
			// evaluate whole current instruction string
			var formattedComment = formatUtilsJH.formatComment(currentInstructionsString)
			generator.log(`${chalk.cyan("Evaluation of ")} ${formattedComment.replace(/\\"/g, '"')}`)
			eval(formattedComment.replace(/\\"/g, '"'));
			}
		} while (m);
}

// array holding for each key a function
registryOfStoredReplacement = [];
var Replacer = {
  replaceRegex: function(expression1, expression2) {
	currentEntityReplacerGenerator.log(`${chalk.green('Replacing first match')} for ${expression1} with ${expression2}`); 
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);
	currentEntityReplacerGenerator.fs.write(path.join(process.cwd(), fullPath), javaTextSync.replace(new RegExp(expression1), expression2));
  },
  replaceRegexAll: function(expression1, expression2) {
	currentEntityReplacerGenerator.log(`${chalk.green('Replacing ALL matches')} for ${expression1} with ${expression2}`);
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);	
	currentEntityReplacerGenerator.fs.write(path.join(process.cwd(), fullPath), javaTextSync.replace(new RegExp(expression1, 'g'), expression2));
  },
  storeReplacements: function (name, func) {
	//currentEntityReplacerGenerator.log(`${chalk.green('Storing:')} ${name}`);
	registryOfStoredReplacement[name] = func;
  },
  applyStoredReplacements: function (storedReplacement) {
	var functionToBeEvaled = registryOfStoredReplacement[storedReplacement];
	var that  = this;
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);
	// insert `replacer = that` in the code that will be executed in order to have the correct reference for `replacer` param 
	functionToBeEvaled = functionToBeEvaled.toString().replace(new RegExp('(function\\s*\\(replacer\\)\\s*\\{)'), '$1\nreplacer=that;');
	currentEntityReplacerGenerator.log(`${chalk.green('Applying stored replacement:')} ${storedReplacement}`);
	eval('(' + functionToBeEvaled + ')();');
  },
  insertElement: function (insertion) {
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);
	currentEntityReplacerGenerator.log(`${chalk.green('Inserting before field')} ${currentFieldOrClass} ${insertion}`);
	var isClass = currentFieldOrClass.includes("class");
	var regex =  isClass ? new RegExp("(\s*" + currentFieldOrClass + "\\s*)") : new RegExp("(.*" + currentFieldOrClass + "\\s*;)");
	var charBeforeInsertion = isClass ? '' : '\t';
	currentEntityReplacerGenerator.log(`${chalk.green('Inserting:Regex')} ${regex.toString()}`);	
	currentEntityReplacerGenerator.fs.write(path.join(process.cwd(), fullPath), javaTextSync.replace(regex, charBeforeInsertion + insertion + '\n$1'));
  },
  replaceRegexWithCurlyBraceBlock: function (regexString) {
	currentEntityReplacerGenerator.log(`${chalk.green('Deleting method that matches regex ')} ${regexString}`);
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);
	var curlyBracesStack = [];
	// where method starts
	var positionOfMatch = javaTextSync.search(new RegExp(regexString));
	if (positionOfMatch != -1) {
		indexOfFirstBracket = javaTextSync.indexOf("{", positionOfMatch);
		if (indexOfFirstBracket != -1) {
			curlyBracesStack.push("{");
			// will be incremented as long as each bracket has a match and 
			// it will denote the end of method, at the end of this loop
			var startIndex = indexOfFirstBracket;
			// brackets must not be taken into consideration if we are inside " or '
			var isInSingleQuotation = false;
			var isInDoubleQuotation = false;
			while (curlyBracesStack.length != 0) {
				++startIndex;
				if (javaTextSync.charAt(startIndex) == '"') {
					isInDoubleQuotation =  !isInDoubleQuotation;
				} else if (javaTextSync.charAt(startIndex) == "'") {
					isInSingleQuotation = !isInSingleQuotation;
				} else if (!isInDoubleQuotation && !isInSingleQuotation && javaTextSync.charAt(startIndex) == "{") {
					curlyBracesStack.push("{");
				} else if (!isInDoubleQuotation && !isInSingleQuotation && javaTextSync.charAt(startIndex) == "}") {
					curlyBracesStack.pop();
				}
			}
			currentEntityReplacerGenerator.log(`${chalk.green('Matched full method body from ')} ${positionOfMatch} to ${startIndex}`); 
			currentEntityReplacerGenerator.fs.write(path.join(process.cwd(), fullPath), javaTextSync.replace(javaTextSync.substring(positionOfMatch, startIndex + 1), ""));	
		}
	}
  },
  insertBeforeElement: function (elementName, insertion) {
	currentEntityReplacerGenerator.log(`${chalk.green('Inserting before element ')} ${elementName} ${insertion}`);	
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);
	currentEntityReplacerGenerator.fs.write(path.join(process.cwd(), fullPath), javaTextSync.replace(new RegExp("(.*private.*" + elementName + ".*;)"), '\t' + insertion + '\n$1'));
  }
};

var replacer = Object.create(Replacer);

// predefined commands
replacer.storeReplacements("insertAnnotGenEntityDtoAboveClass", function(replacer) {
	replacer.insertElement("@GenEntityDto(superClass = TempAbstractDto.class)");
	replacer.replaceRegex("(package\s*.*;)", "$1\nimport com.crispico.annotation.definition.GenEntityDto;");
	replacer.replaceRegex("(package\s*.*;)", "$1\nimport com.crispico.absence_management.shared.dto.TempAbstractDto;");
});

replacer.storeReplacements("insertAnnotGenDtoCrudRepositoryAndServiceAboveClass", function(replacer) {
	replacer.insertElement("@GenDtoCrudRepositoryAndService");
	replacer.replaceRegex("(package\s*.*;)", "$1\nimport com.crispico.annotation.definition.GenDtoCrudRepositoryAndService;");
});

replacer.storeReplacements("addImportForGenEntityDtoField", function(replacer) {
	replacer.replaceRegex("(package\s*.*;)", "$1\nimport com.crispico.annotation.definition.GenEntityDtoField;");
});

replacer.storeReplacements("addImportForFieldInclusion", function(replacer) {
	replacer.replaceRegex("(package\s*.*;)", "$1\nimport com.crispico.annotation.definition.util.EntityConstants.FieldInclusion;");
});
replacer.storeReplacements("insertAnotGenEntityDtoFieldAboveField", function(replacer) {
	replacer.insertElement("@GenEntityDtoField(inclusion=FieldInclusion.EXCLUDE)");
});