const formatUtilsJH = require('jhipster-core/lib/utils/format_utils.js');
const path = require('path');
const chalk = require('chalk');

module.exports = {
    applyModificationsToFile
};

function applyModificationsToFile(entityName, fullPath, generator) {
		// !!!all variables declared without `var` need to be available outside this module
		currentEntityReplacerGenerator = generator;
		// @ApiModelProperty("This is a comment bla bla. {{{// aici avem cod js pe care... }}}")  becomes @ApiModelProperty("This is a comment bla bla.") 
		var regexApiModelProp = '((?:@ApiModelProperty|@ApiModel)\\(.*?)\\{\\{\\{.*\\}\\}\\}(.*?\\))';
		generator.replaceContent(fullPath, regexApiModelProp, "$1$2", true);		
		var javaText = generator.fs.read(fullPath);
		
		eval(generator.fs.read('./jhipster-entity-replacer.js'));
		if (typeof $r.entity === "function") {
			generator.log(`${chalk.red("Executing global default function")} entity()`);
			$r.entity();	
		}
		// match the whole text between {{{...}}} tags
		var re = new RegExp('(\\{\\{\\{([\\s\\S]*?)\\}\\}\\})[\\s\\S]*?(?:(.*class[\\s\\S]*?\\{)|.*?(\\w+);)', 'g');
		// iterate through whole file and get the instructions string between {{{...}}} for each field 
		do {
		var m = re.exec(javaText);
		if (m) {
			currentFieldOrClass = m[3] ? m[3] : m[4];
			generator.log(`${chalk.red("Executing from field/class: ")} ${currentFieldOrClass}`)
			var currentInstructionsString = m[2];
			// delete snippets like {{{ ...}}} from comments
			generator.replaceContent(fullPath, m[1], "");
			// evaluate whole current instruction string
			var formattedComment = formatUtilsJH.formatComment(currentInstructionsString)
			generator.log(`${chalk.cyan("Evaluation of ")} ${formattedComment.replace(/\\"/g, '"')}`)
			eval(formattedComment.replace(/\\"/g, '"'));
			}
		} while (m);
		// empty comments may reside after deleting snippets like {{{...}}}
		// from comments if those snippets were the only thing found in comments
		generator.replaceContent(fullPath, "\\s*\\/\\*[\\*\\s]+\\*\\/", "\n", true);		
		
}


var Replacer = {
  replaceRegex: function(replaceWhat, replaceWith) {
	currentEntityReplacerGenerator.log(`${chalk.green('Replacing first match')} for ${replaceWhat} with ${replaceWith}`); 
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);
	currentEntityReplacerGenerator.fs.write(path.join(process.cwd(), fullPath), javaTextSync.replace(new RegExp(replaceWhat), replaceWith));
  },
  replaceRegexAll: function(replaceWhat, replaceWith) {
	currentEntityReplacerGenerator.log(`${chalk.green('Replacing ALL matches')} for ${replaceWhat} with ${replaceWith}`);
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);	
	currentEntityReplacerGenerator.fs.write(path.join(process.cwd(), fullPath), javaTextSync.replace(new RegExp(replaceWhat, 'g'), replaceWith));
  },
  insertElementAboveClass: function(insertion) {
	var regex =  new RegExp("(\\s*public class " + entityName + "\\s*)");
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);
	currentEntityReplacerGenerator.log(`${chalk.green('Regex searched when inserting above class')} ${regex.toString()}`);	
	currentEntityReplacerGenerator.fs.write(path.join(process.cwd(), fullPath), javaTextSync.replace(regex, "\n" + insertion + '$1'));
  },
  insertElement: function (insertion) {
	var javaTextSync = currentEntityReplacerGenerator.fs.read(fullPath);
	currentEntityReplacerGenerator.log(`${chalk.green('Inserting before field')} ${currentFieldOrClass} ${insertion}`);
	var isClass = currentFieldOrClass.includes("class");
	var regex =  isClass ? new RegExp("(\s*" + currentFieldOrClass + "\\s*)") : new RegExp("(.*" + currentFieldOrClass + "\\s*;)");
	var charBeforeInsertion = isClass ? '' : '\t';
	currentEntityReplacerGenerator.log(`${chalk.green('Regex searched when inserting before field')} ${regex.toString()}`);	
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

var $r = Object.create(Replacer);

// predefined commands
$r.insertAnnotGenEntityDtoAboveClass = function() {
	this.insertElement("@GenEntityDto(superClass = TempAbstractDto.class)");
	this.regex("(package\s*.*;)", "$1\nimport com.crispico.annotation.definition.GenEntityDto;");
	this.regex("(package\s*.*;)", "$1\nimport com.crispico.absence_management.shared.dto.TempAbstractDto;");
};

$r.insertAnnotGenDtoCrudRepositoryAndServiceAboveClass = function() {
	this.insertElement("@GenDtoCrudRepositoryAndService");
	this.regex("(package\s*.*;)", "$1\nimport com.crispico.annotation.definition.GenDtoCrudRepositoryAndService;");
};

$r.addImportForGenEntityDtoField = function() {
	this.regex("(package\s*.*;)", "$1\nimport com.crispico.annotation.definition.GenEntityDtoField;");
};

$r.addImportForFieldInclusion = function() {
	$r.regex("(package\s*.*;)", "$1\nimport com.crispico.annotation.definition.util.EntityConstants.FieldInclusion;");
};

$r.insertAnotGenEntityDtoFieldAboveField = function() {
	$r.insertElement("@GenEntityDtoField(inclusion=FieldInclusion.EXCLUDE)");
};