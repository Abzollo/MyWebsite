// Global variables
var start = false;
var testme = "";
var varRegExp = /^[A-Za-z][A-Za-z0-9_]*$/;
var objRegExp = /^[+-.0-9*a-zA-Z_]+$/;
var constRegExp = /^[+-.0-9*a-zA-Z_]+[<>][=]?[+-.0-9*a-zA-Z_]+$/;
var badsym = [/\+\+/, /\-\-/, /\.\./, /[0-9.a-zA-Z][*][0-9.]/, /^[*_]/, /[-+*]+[<=>]+/, /[<=>][*_]/, /[-+*<=>][.][a-zA-Z]/, /[-+*][_*$]/];
var numConst = 1;  // The number of constraint BOXES (not used except when dealing with the boxes)
var numVar;
var precision = 2;
var simplexMat;  // Simplex matrix
var variables;
var basic;
var solHist = [];
var hist;
var maximize;
var numPivot = 0;
var originalObj;
// State variables
var infeasible = false;
var subproblem = false;
var unbounded = false;
var optimum = false;
// IP
var integer = false;
var solvedIP;
var originalLP;
var originalVars;
var originalBasic;
var sol = [];
var LP;
var lastLP;
var level;
var IP_Tree = [];
var finalOutput = "";
var bestCand;

$(document).ready(function(){
    
    $("#toggleGuide").click(function() {
        $("#guide").toggle();
        if ($("#toggleGuide").val() == "v") {
            $("#toggleGuide").val("^");
        } else {
            $("#toggleGuide").val("v");
        }
    });
    
    $("#toggleOptions").click(function() {
        $("#options").toggle();
    });
    
    $("#clearAll").click(function() {
        $("#Obj").val("");
        $("#allConsts").val("");
        for (var i = 1; i < numConst + 1; i++) {
            $("#Const" + i).val("");
        }
    });
    
    // Allow constraints input the way the user wants
    var oldFormat = $('input:radio[name=ConstFormat]:checked').val();  // default value
    $("#ConstChoice").click(function () {
        var newFormat = $('input:radio[name=ConstFormat]:checked').val();
        if (newFormat != oldFormat) {
            
            if (newFormat == "multiple") {
                $('#ConstBox').hide();
                $('#ConstButtons').show();
                $('#Consts').show();
                transferConst(newFormat);
            } else {
                $('#ConstButtons').hide();
                $('#Consts').hide();
                $('#ConstBox').show();
                transferConst(newFormat);
            }
            
            oldFormat = newFormat;
        }
    });
    
    // Show and hide IP buttons based on user's choice
    $("#IP_Choice").click(function () {
        var choice = $('input:radio[name=integer]:checked').val();
        
        if (choice == "yes") {
            $('#solveIP').show();
            $('#resultIP').show();
            $('#showIP').show();
            $('#startLP').hide();
            $('#pivotLP').hide();
            $('#solveLP').hide();
            $('#back').hide();
            $('#next').hide();
        } else {
            $('#solveIP').hide();
            $('#resultIP').hide();
            $('#showIP').hide();
            $('#startLP').show();
            $('#pivotLP').show();
            $('#solveLP').show();
            $('#back').show();
            $('#next').show();
        }
    });
    
    // Add constraint
    $("#addConst").click(function () {
    
        if(numConst > 14){
            alert("Only 15 constraints are allowed");
            return false;
        }
        
        numConst++;  // Constraint added
        
        var newConstDiv = $(document.createElement('div')).attr("id", 'ConstDiv' + numConst);
        newConstDiv.after().html(
            '<input type="text" id="Const' + numConst +'" class="input maxlength=60"><br>'
            );
        
        newConstDiv.hide().appendTo("#Consts").fadeIn("fast");
        
    });
    
    // Remove constraint
    $("#removeConst").click(function () {
        if(numConst == 1){
            alert("At least one constraint is needed");
            return false;
        }
        
        $("#ConstDiv" + numConst).fadeOut("fast", function() {
            $(this).remove();
        });
        
        numConst--;  // Constraint removed
    });
    
    // START simplex, extract data, and initialize
    $("#startLP").click(function() {
        sol = [];
        solHist = [];
        precision = setPrecision($('#precision').val());
        if ($('input:radio[name=maximize]:checked').val() == "maximize") {
            maximize = 1;
        } else {
            maximize = -1;
        }
        var err, i, j, n
        testme = "";
        $("#Sol").val("");
        numPivot = 0;
        optimum = false;
        unbounded = false;
        try {
            
            // EXTRACT //
            
            // Extract objective function
            var objStr = $("#Obj").val();
            // Remove whitespaces
            objStr = objStr.replace(/\s/g, '');
            objStr = objStr.replace('+-', '-');
            objStr = objStr.replace('-+', '-');
            // Check allowed characters
            if (!objRegExp.test(objStr)) {
                err = "Error: invalid expression or unknown symbols at objective function";
                throw err;
            }
            objStr += '$'; //Mark end of string
            // Check for bad symbols
            for (j = 0; j < badsym.length; j++) {
                if (badsym[j].test(objStr)) {
                    err = "Error: expression contains bad symbols at objective function. Regex is " + badsym[j].toString();
                    throw err;
                }
            }
            
            // Extract constraints based on the format
            var constStrText;
            var constStr = [];
            var informat = $('input:radio[name=ConstFormat]:checked').val();
            if (informat == "multiple") {
                for (i = 0; i < numConst; i++) {
                    n = i + 1;
                    constStr.push($("#Const" + n).val());
                }
            } else {
                constStrText = $("#allConsts").val().split("\n");
                for (i = 0; i < constStrText.length; i++) {
                    if (constStrText[i]) {
                        constStr.push(constStrText[i]);
                    }
                }
            }
            
            for (i = 0; i < constStr.length; i++) {
                // Remove whitespaces and fix signs
                constStr[i] = constStr[i].replace(/\s/g, '');
                constStr[i] = constStr[i].replace('+-', '-');
                constStr[i] = constStr[i].replace('-+', '-');
                // Check allowed characters
                if (!constRegExp.test(constStr[i])) {
                    n = i + 1;
                    err = "Error: invalid expression or unknown symbols at constraint #" + n + ".";
                    throw err;
                }
                constStr[i] += '$'; //Mark end of string
                // Check for bad symbols
                for (j = 0; j < badsym.length; j++) {
                    if (badsym[j].test(constStr[i])) {
                        n = i + 1;
                        err = "Error: expression contains bad symbols at constraint #" + n + ". Regex is " + badsym[j].toString();
                        throw err;
                    }
                }
            }
            
            
            // GET VARIABLES //
            // Use a function getVariables (vars names added to "variables")
            variables = [];
            getVariables(variables, objStr);
            for (i = 0; i < constStr.length; i++) {
                getVariables(variables, constStr[i]);
            }
            
            //#1//
            
            // get set of variables
            variables = set(variables);
            testme += "Variables: " + variables + "\n\n";
            
            // Check variables syntax
            for (i = 0; i < variables.length; i++) {
                if (!varRegExp.test(variables[i])) {
                    err = "Invalid variable name: " + variables[i];
                    throw err;
                }
            }
            
            // Initialize matrix
            simplexMat = [];
            var row;
            // Add zeros for a matrix of size (rows: #Const + 1, cols: #Vars + #Const + 2)
            for (i = 0; i < constStr.length + 1; i++) {
                row = []
                for (j = 0; j < variables.length + constStr.length + 2; j++) {
                    row.push(0);
                }
                simplexMat.push(row);
            }
            
            
            // ASSIGN VALUES TO MATRIX //
            // Objective function
            testme += "Parse: " + objStr + "\n";
            parseExpression(simplexMat, variables, objStr, 0, maximize * -1);
            
            // Constraints
            var constSign;  // +1 if <=, -1 if >=
            for (n = 0; n < constStr.length; n++) {
                testme += "Parse: " + constStr[n] + "\n";
                // Split constraint at inequality operator
                if (contains(constStr[n], '<')) {
                    constSign = +1;
                    if (contains(constStr[n], '=')) {
                        constStr[n] = constStr[n].split('<=');
                        constStr[n][0] += '$';
                    } else {
                        constStr[n] = constStr[n].split('<');
                        constStr[n][0] += '$';
                    }
                    constStr[n].push("<=");
                } else {
                    constSign = -1;
                    if (contains(constStr[n], '=')) {
                        constStr[n] = constStr[n].split('>=');
                        constStr[n][0] += '$';
                    } else {
                        constStr[n] = constStr[n].split('>');
                        constStr[n][0] += '$';
                    }
                    constStr[n].push(">=");
                }
                
                parseExpression(simplexMat, variables, constStr[n][0], n + 1, constSign);  // lhs
                parseExpression(simplexMat, variables, constStr[n][1], n + 1, -constSign);  // rhs
            }
            
            // Assign z
            simplexMat[0][0] = 1;
            
            // Assign slacks and add to variables
            // Basic variables at the beginning are the slacks
            numVar = variables.length;
            basic =[];
            for (i = 1; i < simplexMat.length; i++) {
                simplexMat[i][numVar + i] = 1;
                variables.push('s' + i);
                basic.push('s' + i);
            }
            
            // PRINT PROBLEM & MATRIX //
            var output = "";
            output += printIntro(simplexMat, variables, precision);
            output += "\n\nInitial Tableau\n\n" + printMat(simplexMat, variables, basic, precision);
            
            // Add solution to output box
            $("#Sol").val(output);
            // Add output to history
            hist = 0;
            solHist[hist] = output;
            
            // Record original matrix and basic variables for future use (IP)
            originalLP = copyMat(simplexMat);
            originalVars = variables.slice();
            originalBasic = basic.slice();
            
            // Start is initiated successfully
            start = true;
        }
        catch(err) {
            alert(err);
        }
        
    });  // End "Start" button, done with initializing simplex matrix "simplexMat'

    // START simplex, extract data, and initialize
    $("#pivotLP").click(function() {
        
        var output = "";
        
        // Index of entering and leaving variables
        var enter, leave;
        var maxratio = 0;
        var num
        var p = numPivot + 1;
        var i, j, n;
        
        // START SIMPLEX //
        try {
            if (!start) {
                throw "You have to start the LP first.";
            }
            if (optimum || unbounded) {
                throw "Can't pivot anymore :("
            }
            
            // Do at origin
            if (!numPivot) {
                infeasible = checkInfeasible(simplexMat);
            }
                
            // If infeasible, add x! and set enter and leave variables
            if (infeasible) {
                output += "\n---- ADD ARTIFICIAL VARIABLE ----\n\n";
                output += "Infeasible origin\nAdd artificial variable x!\nSub-problem objective: minimize x!\n\n";
                subproblem = true;
                infeasible = false;
                // Copy and clean original objective functions
                originalObj = simplexMat[0].slice();
                leave = addArtificialVar(simplexMat, variables);  // Return index of most infeasible constraint
                enter = simplexMat[0].length - 2;  // Artificial variable is always entering first
                // Change output
                output +=  printMat(simplexMat, variables, basic, precision);
                output += "\n--> PIVOT #" + p + "\n\n";
                output += "Entering variable: " + variables[enter - 1] + "\nLeaving variable: " + basic[leave - 1] + "\n\n";
                // Change basic variable
                basic[leave - 1] = variables[enter - 1];
            
            } else {
                // Check optimality
                optimum = true;
                leave = true;  // because false means unbounded, and leave is not initialized yet
                for (j = 1; j < simplexMat[0].length - 1 && optimum; j++) {
                    if (simplexMat[0][j] < 0) {
                        optimum = false;
                    }
                }
                // Find entering and leaving variables if not optimal
                if (!optimum) {
                    // Find entering variable
                    var val = 1;
                    for (j = 1; j < simplexMat[0].length - 1; j++) {
                        if (simplexMat[0][j] < val) {
                            val = simplexMat[0][j];
                            enter = j;
                        }
                    }
                    // Find leaving variable (function return false if unbounded)
                    leave = checkRatios(simplexMat, enter);
                    if (leave) {   
                        // Change output
                        output += "\n--> PIVOT #" + p + "\n\n";
                        output += "Entering variable: " + variables[enter - 1] + "\nLeaving variable: " + basic[leave - 1] + "\n\n";
                    }
                    // Change basic variable
                    basic[leave - 1] = variables[enter - 1];
                
                }
            }
            
            // Check unboundedness
            if (!leave) {
                unbounded = true;
                output += "\n---- PROBLEM IS UNBOUNDED ----\n\n";
            } else if (optimum) {
                if (subproblem) {
                    // Special case (x! is a basic variable)
                    if (contains(basic, 'x!')) {
                        var m = basic.indexOf('x!') + 1;
                        // if x! is not 0
                        if (simplexMat[m][simplexMat[m].length - 1]) {
                            output += "\n---- PROBLEM HAS NO FEASIBLE SOLUTIONS ----\n\n";
                            unbounded = true;  // Not actually unbounded, just to terminate the program
                        } else {
                            output += "\n--> PIVOT #" + p + "\n\n";
                            output += "x! = 0. Pivot with the first non-basic variable\n\n";
                            for (n = 1; n < simplexMat[m].length; n++) {
                                if (simplexMat[m][n]) {
                                    break;  // Find first non-zero number
                                }
                            }
                            basic[m - 1] = variables[n - 1];
                            pivot(simplexMat, n, m);
                            numPivot++;
                            output += printMat(simplexMat, variables, basic, precision);
                        }
                    // If still feasible (NOTE: unbounded here means no feasible solutions)
                    } if(!unbounded) {
                        optimum = false;
                        subproblem = false;
                        output += "\n---- REMOVE ARTIFICIAL VARIABLE ----\n\n";
                        output += "Now return to original objective function\n";
                        output += "Remove x!, and write objective function in terms of non-basic variables\n\n";
                        removeArtificialVar(simplexMat, variables, basic, originalObj);
                        }
                } else {
                    // Check infeasible again if optimum
                    infeasible = checkInfeasible(simplexMat);
                    if (infeasible) {
                        optimum = false;
                    } else {
                        output += "\n---- OPTIMAL SOLUTION REACHED ----\n\n";
                    }
                }
            } else {
                pivot(simplexMat, enter, leave);
                numPivot++;
            }
            
            // Print matrix
            if (unbounded) {
                output += "No feasible solutions.";
            } else if (optimum) {
                output += printResult(simplexMat, variables, basic, precision);
                // Get solution
                sol.push(simplexMat[0][simplexMat[0].length - 1]);
                sol.push(getCorner(simplexMat, variables, basic, precision));
            } else if (!infeasible) {
                output += printMat(simplexMat, variables, basic, precision);
            }
            
            // Add solution to output box
            if ($('input:radio[name=SolAppend]:checked').val() == "yes") {
                $("#Sol").val($("#Sol").val() + output);
            } else {
                $("#Sol").val(output);
            }
            // Add output to history
            solHist[++hist] = output;
            
        } catch (err) {
            alert(err);
        }
    });
    
    $("#solveLP").click(function() {
        if (!start) {
            alert("You have to start the LP first.");
        } else {
            while (!optimum && !unbounded) {
                $("#pivotLP").click();
            }
        }
    });
    
    $("#next").click(function () {
        if (hist < solHist.length - 1 && $('input:radio[name=SolAppend]:checked').val() == "no") {
            $("#Sol").val(solHist[++hist]);
        }
    });
    
    $("#back").click(function () {
        if (hist > 0 && $('input:radio[name=SolAppend]:checked').val() == "no") {
            $("#Sol").val(solHist[--hist]);
        }
    });

    $("#solveIP").click(function () {
        start = false;
        $("#startLP").click();
        try {
            if (!start) {
                throw "Problem was not initiated successfully.";
            }
            
            var solDetail = Boolean($('input:radio[name=SolAppend]:checked').val() == "yes");
            var output;
            var candidate;
            var node;
            var queue = [0];
            var parentLP;
            IP_Tree = [];
            LP = null;
            lastLP = 0;
            level = 0;
            solvedIP = false;
            
            while (!solvedIP) {
                // Fix output according to user's choice
                if (solDetail) {
                    output = "";
                } else {
                    output = $("#Sol").val();
                }
                
                if (queue.length) {
                    // Next in queue
                    LP = queue.shift();
                } else {
                    solvedIP = true;
                    break;
                }
                node = {};
                node.id = LP;
                
                // Check parent node for constraints
                parentLP = getParentNode(IP_Tree, LP);
                if (~parentLP) {
                    parentLP = findIndexOfLP(IP_Tree, parentLP);
                    node.parent = parentLP;
                    node.level = IP_Tree[parentLP].level + 1;
                    level = node.level > level ? node.level : level;
                    // Check already added constraints, and add the new one (and remove it from parent)
                    node.constraints = IP_Tree[parentLP].constraints.slice();
                    node.constraints.push(IP_Tree[parentLP].branch.shift());
                    
                } else {
                    // Only for LP #0
                    node.parent = null;
                    node.level = 0;
                    node.constraints = [];
                }
                
                // Add constraints to the original matrix
                simplexMat = copyMat(originalLP);
                variables = originalVars.slice();
                basic = originalBasic.slice();
                var basInd;
                for (var i = 0; i < node.constraints.length; i++) {
                    simplexMat.push(node.constraints[i].slice());
                    basInd = originalBasic.length + i + 1;
                    basic.push("s" + basInd);
                    variables.push("s" + basInd);
                }
                fixMat(simplexMat, node.constraints.length);  // Fix values for new constraints
                
                // Reinitialize state vars and get solution
                sol = [];
                numPivot = 0;
                unbounded = false;
                optimum = false;
                // Fix output according to user's choice
                output += "\n---- LP #" + LP + "----\n\n";
                output += printMat(simplexMat, variables, basic, precision);
                if (solDetail) {
                    $("#Sol").val($("#Sol").val() + output);
                    output = "";
                }
                $("#solveLP").click();
                if (!solDetail) {
                    output += $("#Sol").val();
                    $("#Sol").val("");
                }
                
                // Add solution to node
                if (sol.length) {
                    node.obj = sol[0];
                    node.sol = sol[1];
                    
                    // Check if solution is integer
                    candidate = true
                    for (var i = 0; i < sol[1].length; i++) {
                        if (Math.floor(sol[1][i]) !== sol[1][i]) {
                            output += "\n\nFound a non-integer in the solution: " + sol[1][i];
                            output += "\nBranch to two new LPs by adding new constraints:";
                            output += "\nLP #" + String(lastLP + 1) + ": " + variables[i] + " <= " + Math.floor(sol[1][i]);
                            output += "\nLP #" + String(lastLP + 2) + ": " + variables[i] + " >= " + Math.ceil(sol[1][i]) + "\n\n";
                            node.child = [lastLP + 1, lastLP + 2];
                            queue.unshift(lastLP + 1, lastLP + 2);
                            lastLP += 2;
                            node.branch = getConst(originalLP[0].length, i, sol[1][i]);
                            candidate = false;
                            break;
                        } 
                    }
                    node.cand = candidate;
                    if (candidate) {
                        output += "\n\nCandidate solution for the integer program\nStop branching from this LP.\n\n";
                        node.branch = [];
                        node.child = [];
                    }
                    
                } else {
                    output += "\n\nStop branching from this LP.\n\n";
                    node.obj = null;
                    node.sol = [];
                    node.branch = [];
                    node.child = [];
                    node.cand = false;
                }
                
                IP_Tree.push(node);
                $("#Sol").val($("#Sol").val() + output);
            }
            
            // Now get the best IP solution candidate
            finalOutput = "\n---- ALL IP TREE NODES SEARCHED ----\n";
            bestCand = findIndexOfLP(IP_Tree, getBestCand(IP_Tree));
            if (~bestCand) {
                finalOutput += "\nOptimal integer solution found in LP #" + IP_Tree[bestCand].id + ":";
                finalOutput += "\nObjective value = " + IP_Tree[bestCand].obj;
                finalOutput += "\nOptimal solution = (" + IP_Tree[bestCand].sol.join(", ") + ").\n\n";
            } else {
                finalOutput += "\nCouldn't find an integer solution.\n\n";
            }
            
            $("#Sol").val($("#Sol").val() + finalOutput);
            
        } catch (err) {
            //alert(err);
        }
    });
    
    $("#resultIP").click(function () {
        if (solvedIP) {
            $("#Sol").val(finalOutput);
        } else {
            finalOutput = "";
            $("#solveIP").click();
            $("#Sol").val(finalOutput);
        }
    });
    
    $("#showIP").click(function () {
        try {
            if (!solvedIP) {
                throw "Please solve IP first.";
            }
            var i, j;
            var output = [];
            var edge = 3;
            var branchEdge = [];
            
            // Branching edge lengths for each level
            for (i = level - 1; i >= 0; i--) {
                branchEdge.push(edge * Math.pow(2, i));
            }
            
            // Set the index of LPs in the output, and find width and height of output
            var width = setTreeIndex(IP_Tree, branchEdge);
            var first = width[0];
            var last = width[1];
            
            output = getSpaces(4 * level + 1, last - first + 4);  // height and width of output
            drawTree(IP_Tree, -first + 2, branchEdge, output);  // -first is the number of indexes we push the lines of the output
            $("#Sol").val("\n---- IP BRANCH-AND-BOUND TREE ----\n\n" + output.join("\n") + getIPProcess(IP_Tree));
            
            
            
        } catch (err) {
            alert(err);
        }
    });
});

// Functions
function contains(arr, x) {
    return ~arr.indexOf(x);
}

function set(arr) {
    var s = [];
    for (var i = 0; i < arr.length; i++) {
        if (!contains(s, arr[i])) {
            s.push(arr[i]);
        }
    }
    return s;
}

function setPrecision(prec) {
    prec = Number(prec);
    var precMax = 6;
    
    if (isNaN(prec)) {
        return 2;
    } else if (prec > precMax) {
        return precMax;
    } else if (prec < 0) {
        return 0;
    } else {
        return prec;
    }
}

function transferConst(format) {
    if (format == "one") {
        var t = "";
        var n;
        testme = "";
        for (var i = 0; i < numConst; i++) {
            n = i + 1;
            t += $("#Const" + n).val() + "\n";
        }
        $("#allConsts").val(t);  // Ignore last \n
        testme = t;
    } else {
        var t = $("#allConsts").val().split("\n")
        // Clean t
        var tnew = [];
        for (var i = 0; i < t.length; i++) {
            if (t[i]) {
                tnew.push(t[i]);
            }
        }
        // Add boxes according to numConst and given constraints
        while (numConst < tnew.length && numConst < 15) {
            $("#addConst").click();
        }
        while (numConst > tnew.length && numConst > 1) {
            $("#removeConst").click();
        }
        
        for (i = 0; i < numConst; i++) {
            n = i + 1;
            $("#Const" + n).val(tnew[i]);
        }
        testme = tnew;
    }
}

function getVariables(vars, expr) {
    // vars is the array we push the variables to
    // expr is the expression from which we extract the variables
    
    var variable = "";
    var varmode = false;
    var addVar = false;
    
    // Go through string character by character
    for (i = 0; i < expr.length; i++) {
        // Start recording variable (always starts with a letter)
        if (!varmode && /[a-zA-Z]/.test(expr[i])) {
            varmode = true;
            addVar = false;
        }
        // Stop and add recorded variable
        if (/[-+<>$]/.test(expr[i])) {
            varmode = false;
            addVar = true;
        }
        // Add character if in variable-name mode
        if (varmode) {
            variable += expr[i];
        }
        // Add variable ONLY when the string is not empty
        if (addVar && variable != "") {
            vars.push(variable);
            // Restart
            variable = "";
            addVar = false;
        }
    }
}

function parseExpression(sim, vars, expr, m, sign) {
    // sim is the simplex matrix we'll assign values to
    // vars is the array of the variables we found
    // expr is the expression we are parsing (objective function)
    // m is the row number of the expression in the simplex matrix
    // sign is the sign of the coefficient when added to the matrix
    
    var coeff = "";
    var variable = "";
    var varmode = false;
    var coeffmode = false;
    var assignVal = false;
    var ind;
    
    // Go through string
    for (i = 0; i < expr.length; i++) {
        if (expr[i] == '*') {
            continue;
        }
        // Start recording variable (always starts with a letter)
        if (/[a-zA-Z]/.test(expr[i])) {
            varmode = true;
            coeffmode = false;
        }
        // Always record coefficient when not in varmode, and it's a number
        if (!varmode && /[0-9.]/.test(expr[i])) {
            coeffmode = true;
        }
        // Stop varmode and coeffmode, and assign the current coeff and var
        if (/[-+$]/.test(expr[i])) {
            assignVal = true;
            coeffmode = false;
            varmode = false;
            // Assign the sign at the end
        }
        // add to coeff in coeffmode
        if (coeffmode) {
            coeff += expr[i]
        }
        // add to var in varmode
        if (varmode) {
            variable += expr[i];
        }
        // Assign value
        if (assignVal) {
            // If there's a variable
            if (variable != "") {
                if (coeff == "") {
                    coeff = "+1";
                } else if (coeff == "+") {
                    coeff = "+1";
                } else if (coeff == "-") {
                    coeff = "-1";
                }
                testme += "-> " + coeff + " " + variable + " at: " + i + "\n";
                // Check variable index and add coefficient
                ind = vars.indexOf(variable);
                sim[m][ind + 1] += sign * Number(coeff);
            } else if (coeff != "" && m != 0) {
                testme += "-> " + coeff + " at: " + i + "\n";
                sim[m][sim[m].length - 1] += -sign * Number(coeff); // Add number (negative)
                coeff = "";
            }
            variable = "";
            coeff = expr[i]; // Take sign here for next coeff, $ will always be last
            assignVal = false;
        }
    }
}

function printExpression(row, vars, prec) {
    var t = "";
    
    for (var j = 1; j < numVar + 1; j++) {
        if (row[j] == 0) {
            continue;
        } else if (row[j] < 0) {
            t += "- ";
        } else if (j > 1) {
            t += "+ ";
        }
        
        // Don't show a coefficient of 1
        if (Math.abs(row[j]) != 1) {
            t += getPrecNum(Math.abs(row[j]), prec) + " ";
        }
        
        // Print variable
        t += vars[j - 1] + " ";
    }
    
    return t;
}

function printIntro(sim, vars, prec) {
    var t = "\n";
    
    if (maximize) {
        t += "Maximize\n";
    } else {
        t += "Minimize\n"
    }
    
    var obj = sim[0].slice();
    for (var j = 0; j < obj.length; j++) {
        obj[j] *= -1;
    }
    t += printExpression(obj, vars, prec) + "\n\n";
    t += "Subject to:\n"
    for (var i = 1; i < sim.length; i++) {
        t += printExpression(sim[i], vars, prec) + "<= " + getPrecNum(sim[i][sim[i].length - 1], prec) + "\n";
    }
    
    t += "\nVariables = (" + variables.slice(0, numVar).join(", ") + ")\n";
    
    return t;
}

function printMat(sim, vars, bas, prec) {
    var t = "";
    var maxVarLen = getMaxLenOfVars(vars);
    var maxNumLen = getMaxLenOfNums(sim, prec);
    var cellmax = Math.max(maxVarLen, maxNumLen);  // Get max length of all cells in table
    cellmax += 2;  // One more space each side
    var cellspace;  // Space left in cell
    var lspace;  // Left spaces
    var rspace;  // Right spaces
    var num;  // Numbers in matrix
    
    // First row (all variable names)
    t += repeat(" ", maxVarLen + 2);  // First cell
    // Print Z
    cellspace = cellmax - 1;
    lspace = Math.floor(cellspace / 2);
    rspace = cellspace - lspace;
    t += repeat(" ", lspace) + "Z" + repeat(" ", rspace);
    // Print variable names
    for (var i = 0; i < vars.length; i++) {
        cellspace = cellmax - vars[i].length;
        lspace = Math.floor(cellspace / 2);
        rspace = cellspace - lspace;
        t += " " + repeat(" ", lspace) + vars[i] + repeat(" ", rspace);
    }
    // Print C
    cellspace = cellmax - 1;
    lspace = Math.floor(cellspace / 2);
    rspace = cellspace - lspace;
    t += " " + repeat(" ", lspace) + "C" + repeat(" ", rspace);
    
    // Second row (just dashes)
    t += "\n" + repeat(" ", maxVarLen + 2) + repeat("-", (cellmax + 1) * (vars.length + 2) - 1);
    
    // In-between row (empty with the same columns)
    var inrow = repeat(" ", maxVarLen + 1) + "|" + repeat(" ", cellmax) + "|" + repeat(" ", (cellmax + 1) * vars.length - 1) + "|" + repeat(" ", cellmax) + "|";
    // First in-between row
    var firstinrow = repeat(" ", maxVarLen + 1) + "|" + repeat("-", cellmax) + "|" + repeat("-", (cellmax + 1) * vars.length - 1) + "|" + repeat("-", cellmax) + "|";
    
    // Print matrix
    for (i  = 0; i < sim.length; i++) {
        t += "\n";
        // Print basic variable
        if (i == 0) {
            rspace = maxVarLen;
            t += "Z" + repeat(" ", rspace);
        } else {
            rspace = maxVarLen + 1 - bas[i - 1].length;
            t += bas[i - 1] + repeat(" ", rspace);
        }
        // Print numbers
        for (var j = 0; j < sim[i].length; j++) {
            num = getPrecNum(sim[i][j], prec).toString();
            cellspace = cellmax - num.length;
            lspace = Math.floor(cellspace / 2);
            rspace = cellspace - lspace;
            // print number cell accordingly
            if (j < 2) {
                t += "|" + repeat(" ", lspace) + num + repeat(" ", rspace);
            } else if (j < sim[i].length - 1) {
                t += " " + repeat(" ", lspace) + num + repeat(" ", rspace);
            } else {
                t += "|" + repeat(" ", lspace) + num + repeat(" ", rspace) + "|";
            }
        }
        
        if (i == 0) {
            t += "\n" + firstinrow;
        } else if (i < sim.length - 1) {
            t += "\n" + inrow;
        }
    }
    
    // Last row (just dashes)
    t += "\n" + repeat(" ", maxVarLen + 2) + repeat("-", (cellmax + 1) * (vars.length + 2) - 1) + "\n\n";
    
    return t;
}

function copyMat(mat) {
    var dup = [];
    for (var i = 0; i < mat.length; i++) {
        dup.push(mat[i].slice());
    }
    
    return dup;
}

function repeat(str, num) {
    return new Array(num + 1).join(str);
}

function getMaxLenOfVars(vars) {
    // Apply .length to all elements in array and get the max
    return Math.max.apply(null, vars.map(function(x) {return x.length;}));
}

function getMaxLenOfNums(sim, prec) {
    return sim.reduce(function(prevMax, row) {
        var rowMax = Math.max.apply(null, row.map(function(num) {return getPrecNum(num, prec).toString().length;}));
        return (rowMax > prevMax ? rowMax : prevMax);
        }, 0);
}

function getPrecNum(num, prec) {
    // Get Precise Number
    // Check if int
    if (Math.floor(num) === num) {
        return num;
    } else {
        return +num.toFixed(prec);
    }
}

function checkInfeasible(sim) {
    var state = false;
    for (var i = 1; i < sim.length; i++) {
        if (sim[i][sim[i].length - 1] < 0) {
            state = true;
            break;
        }
    }
    
    return state;
}

function addArtificialVar(sim, vars) {
    var mostInfeasNum = 0;
    var leave;
    for (var j = 1; j < sim[0].length; j++) {
        sim[0][j] = 0;
    }
    sim[0].push(0);
    sim[0][sim[0].length - 2] = 1;  // Before last element is x!
    
    // Add x! in variables
    vars.push("x!");
    
    // Change all constraints (add -x!)
    var num;
    for (var i = 1; i < sim.length; i++) {
        // num is C
        num = sim[i].pop();
        sim[i].push(-1, num);
        if (num < mostInfeasNum) {
            mostInfeasNum = num;
            leave = i;
        }
    }
    
    return leave;
}

function removeArtificialVar(sim, vars, bas, obj) {
    // Remove x! from vars
    vars.pop();
    // Fix constraints
    var num;
    for (var i = 0; i < sim.length; i++) {
        // num is C
        num = sim[i].pop();
        sim[i].pop();
        sim[i].push(num);
    }
    // Return to original objective (in terms of non-basic variables)
    sim[0] = obj.slice();
    var piv;
    var m;
    // Go through objective function
    for (var n = 1; n < sim[0].length; n++) {
        piv = obj[n];  // coefficient of variable in obj func
        if (piv && contains(bas, variables[n - 1])) {
            m = bas.indexOf(variables[n - 1]) + 1;  // basic variable row
            // Go through basic var row (or obj func, they have the same length anyway)
            for (var j = 0; j < sim[m].length; j++) {
                sim[0][j] += -piv * sim[m][j];  // minus because of objective function
            }
        }
    }
    
}

function checkRatios(sim, e) {
    var ratio;
    var maxratio = -1;
    var leave;
    var unbounded = true;  // Assume true, until a positive value is found
    
    for (var i = 1; i < sim.length; i ++) {
        if (sim[i][e] > 0) {
            unbounded = false;
            
            if (sim[i][sim[i].length - 1] == 0) {
                ratio = 0;
            } else {
                ratio = sim[i][e] / sim[i][sim[i].length - 1];
            }
            
            if (ratio > maxratio) {
                maxratio = ratio;
                leave = i;
            }
        }
    }
    
    if (unbounded) {
        return false;
    } else {
        return leave;
    }
}

function pivot(sim, e, l) {
    // Do row operation to make pivot = 1
    var piv = sim[l][e];
    if (piv != 1) {
        for (var j = 0; j < sim[l].length; j++) {
            sim[l][j] /= piv;
        }
    }
    var factor;
    // Row reduction on pivot column
    for (var i = 0; i < sim.length; i++) {
        // Ignore leaving row
        if (i == l) {
            continue;
        }
        
        // Row factor (to cancel entering variable in this row)
        factor = sim[i][e];
        // Do row operations (with the leaving variable row)
        for (j = 0; j < sim[i].length; j++) {
            sim[i][j] -= factor * sim[l][j];
        }
    }
}

function printResult(sim, vars, bas, prec) {
    var t = "";
    var corner = getCorner(sim, vars, bas, prec);
    
    t += "Final Result:";
    t += "\nObjective value = " + getPrecNum(sim[0][sim[0].length - 1], prec);
    t += "\nOptimal solution = (" + corner.join(", ") + ")";
    
    return t;
}

function getCorner(sim, vars, bas, prec) {
    var corner = [];
    var m;
    for (var v = 0; v < numVar; v++) {
        if (contains(bas, vars[v])) {
            m = bas.indexOf(vars[v]) + 1;
            corner.push(getPrecNum(sim[m][sim[m].length - 1], prec));
        } else {
            corner.push(0);
        }
    }
    
    return corner;
}

function getConst(len, ind, num) {
    var c = [];
    var c1 = [];
    var c2 = [];
    
    // Create row of 0s
    for (var i = 0; i < len; i++) {
        c1.push(0);
        c2.push(0);
    }
    
    // Create constraint #1: <=
    c1[ind + 1] = 1;
    c1[c1.length - 1] = Math.floor(num);
    // Create constraint #2: >=
    c2[ind + 1] = -1;
    c2[c2.length - 1] = -Math.ceil(num);
    
    c.push(c1, c2);
    
    return c;
}

function findIndexOfLP(tree, id) {
    for (var i = 0; i < tree.length; i++) {
        if (tree[i].id == id) {
            return i;
        }
    }
    
    return -1;
}

function getParentNode(tree, chico) {    
    for (var i = 0; i < tree.length; i++) {
        if (contains(tree[i].child, chico)) {
            return tree[i].id;
        }
    }
    
    return -1;
}

function fixMat(mat, len) {
    if (len > 0) {
        // Add 0s for new slacks
        var C;
        for (var i = 0; i < mat.length; i++) {
            C = mat[i].pop();
            for (var j = 0; j < len; j++) {
                mat[i].push(0);
            }
            mat[i].push(C);
        }
        
        // Change slacks to 1
        var iLoc;
        var jLoc = mat[0].length - 1 - len;
        for (i = mat.length - len; i < mat.length; i++) {
            iLoc = i - (mat.length - len);
            mat[i][jLoc + iLoc] = 1;
        }
    }
}

function getBestCand(tree) {
    var bestSol = -1;
    var bestLP = -1;
    for (var i = 0; i < tree.length; i++) {
        if (tree[i].cand && tree[i].obj > bestSol) {
            bestSol = tree[i].obj;
            bestLP = tree[i].id;
        }
    }
    
    return bestLP;
}

function setTreeIndex(tree, edgeLength) {
    tree[0].index = 0;
    var first = 0, last = 0;
    
    var leftChild, rightChild;
    for (var i = 0; i < tree.length; i++) {
        if (tree[i].child.length) {
            // Find index of children
            leftChild = findIndexOfLP(tree, tree[i].child[0]);
            rightChild = findIndexOfLP(tree, tree[i].child[1]);
            // Set index of children based on parent's index and its level
            tree[leftChild].index = tree[i].index - edgeLength[tree[i].level];
            tree[rightChild].index = tree[i].index + edgeLength[tree[i].level];
            // first is the minimum index, and last is the maximum index
            first = tree[leftChild].index < first ? tree[leftChild].index : first;
            last = tree[rightChild].index > last ? tree[rightChild].index : last;
        }
    }
    
    return [first, last];
}

function getSpaces(h, w) {
    out = [];
    for (var i = 0; i < h; i++) {
        out.push(repeat(" ", w));
    }
    
    return out;
}

function setCharAt(str, index, chrs) {
    if (index > str.length - 1) {
        return str;
    }
    
    return str.substr(0, index) + chrs + str.substr(index + chrs.length);
}

function drawTree(tree, push, branch, out) {
    var lvl, ind, lp, leftChild, rightChild, edge;
    
    for (var i = 0; i < tree.length; i++) {
        // Set name of LP
        lvl = tree[i].level;
        ind = tree[i].index + push;
        lp = "0" + tree[i].id;
        out[4 * lvl] = setCharAt(out[4 * lvl], ind - 1, "#" + lp.slice(-2));  // Slice is to get only last two digits of LP
        // Set branches of LP (if any)
        if (tree[i].child.length) {
            // Neck
            out[4 * lvl + 1] = setCharAt(out[4 * lvl + 1], ind, "|");
            // Find index of children
            leftChild = findIndexOfLP(tree, tree[i].child[0]);
            rightChild = findIndexOfLP(tree, tree[i].child[1]);
            // Branches
            edge = repeat("-", branch[lvl] - 1);
            out[4 * lvl + 2] = setCharAt(out[4 * lvl + 2], ind - edge.length, edge + " " + edge);
            // Branches necks
            out[4 * lvl + 3] = setCharAt(out[4 * lvl + 3], ind - branch[lvl], "|");
            out[4 * lvl + 3] = setCharAt(out[4 * lvl + 3], ind + branch[lvl], "|");
        }
    }
}

function getIPProcess(tree) {
    var out = "\n\n\nIP PROCESS:";
    var c = 1;
    var obj, sol;
    
    for (var i = 0; i < tree.length; i++) {
        out += "\nLP #" + tree[i].id + ": ";
        if (tree[i].sol.length) {
            obj = getPrecNum(tree[i].obj, precision)
            sol = tree[i].sol.map(function(num) {return getPrecNum(num, precision);})
            out += obj + " at (" + sol.join(", ") + ") -> "
        }
        
        if (tree[i].child.length) {
            out += "BRANCH TO LP #" + tree[i].child[0] + " & LP #" + tree[i].child[1];
        } else if (tree[i].cand) {
            out += "CANDIDATE #" + c++;
        } else {
            out += "INFEASIBLE -> TERMINATE";
        }
    }
    
    out += "\nDONE\n";
    
    return out;
}

