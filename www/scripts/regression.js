$(document).ready(function(){
    // Global variables
    var numvar = 2;  // All variables including response variable
    var precision = 5;
    var regDone = false;
    var respdata;
    var respname;
    var varsnames;
    var varsdata;
    var Beta;
    
    // Add variable row
    $("#addVar").click(function () {
    
        if(numvar>10){
            alert("Only 10 independent variables are allowed");
            return false;
        }
        
        var newVarDiv = $(document.createElement('div')).attr("id", 'VarDiv' + numvar);
        newVarDiv.after().html(
            '<input type="text" class="varname" id="NameVar' + numvar + '" name="NameVar' + numvar + '" value="x' + numvar + '">' + ' : ' +
            '<input type="text" class="vardata" id="DataVar' + numvar + '" name="DataVar' + numvar + '" value=""> <br>'
            );
        
        newVarDiv.hide().appendTo("#Vars").fadeIn("fast");
        
        $("#stattable").append(
            '<tr id="Var' + numvar + '">' +
                '<td id="Var' + numvar + '_name"></td>' +
                '<td id="Var' + numvar + '_coeff"></td>' +
                '<td id="Var' + numvar + '_se"></td>' +
                '<td id="Var' + numvar + '_t"></td>' +
                '<td id="Var' + numvar + '_p"></td>' +
                '<td id="Var' + numvar + '_vif"></td>' +
            '</tr>'
        );
        
        $("#plotbuttons").append(
            '<div id="Var' + numvar + '_radio">' +
            '<input type="radio" name="plotvs" value=' + numvar + ' id="Var' + numvar + '_button"><span id="Var' + numvar + '_span"></span></input>' +
            '</div>'
        );
        
        numvar++;  // Variable added
        
        $("#plotvsdiv").hide();
        regDone = false;
    });
    
    // Remove variable row
    $("#removeVar").click(function () {
        if(numvar==2){
            alert("At least one independent variable is needed");
            return false;
        }
        
        numvar--;  // Variable removed
        
        $("#VarDiv" + numvar).fadeOut("fast", function() {
            $(this).remove();
        });
        
        $('#Var' + numvar).remove();
        $('#Var' + numvar + '_radio').remove();
        
        $("#plotvsdiv").hide();
        regDone = false;
    });
    
    // Start regression analysis
    $("#regression").click(function() {
        
        //Initialize
        respdata = "";
        varsdata = [];
        respname = "";
        varsnames = [];
        var name = "";
        var datarow = "";
        var i;
        var j;
        
        try {
            //Extract response data
            respname = $("#NameResponse").val();
            respname = respname.replace(/[^\w\s]/gi, '');
            
            respdata = $("#DataResponse").val();
            respdata = respdata.split(/[\s,]+/);
            
            var obs = respdata.length;
            for (j = 0; j < obs; j++) {
                respdata[j] = Number(respdata[j]);
                if (isNaN(respdata[j])) {
                    err = "Error: invalid data input for " + respname;
                    throw err;
                }
            }
            
            var ones = []  // for the inetrcept
            for (i = 0; i < obs; i++) {
                ones.push(1);
            }
            varsdata.push(ones);
            
            for (i = 1; i < numvar; i++) {
                // Extract, sanitize, then push name to varnames
                name = $("#NameVar" + i).val();
                name = name.replace(/[^\w\s]/gi, '');
                varsnames.push(name);
                
                // Extract data string, parse, then push to vardata
                datarow = $("#DataVar" + i).val();
                datarow = datarow.split(/[\s,]+/);
                // Now convert each element in datarow to a number
                for (j = 0; j < datarow.length; j++) {
                    datarow[j] = Number(datarow[j]);
                    if (isNaN(datarow[j])) {
                        err = "Error: invalid data input for " + name;
                        throw err;
                    }
                }
                varsdata.push(datarow);
            }
            
            // Check if the number of observations is the same for all vars
            if (obs < numvar) {
                err = "Error: few observations in " + respname;
                throw err;
            }
            for (i = 0; i < varsdata.length; i++) {
                if (varsdata[i].length < numvar) {
                    err = "Error: few observations in " + varsnames[i-1];
                    throw err;
                }
                else if (varsdata[i].length != obs) {
                    err = "Error: a different number of observations found in " + varsnames[i-1];
                    throw err;
                }
            }
            
            // Calculate statistics
            // Use clear names
            var y = respdata;  // row vector
            var X = math.transpose(varsdata);
            var n = obs;
            var p = numvar;
            // Covariances matrix divided by variance
            try {
                var C = math.inv(math.multiply(math.transpose(X), X));
            }
            catch(err) {
                err = "Error: some data are not independent (check data pattern of independent variables)"
                throw err;
            }
            // Least square estimation of parameters (intercept and slopes)
            Beta = math.multiply(C, math.multiply(math.transpose(X), math.transpose(y)));
            // Find sum of squares, degrees of freedom, and mean squares
            var ysum = y.reduce(function(a, b) { return a + b; }, 0);
            var SSE = math.multiply(y, math.transpose(y)) - math.multiply(Beta, math.multiply(math.transpose(X), math.transpose(y)));
            var SSR = math.multiply(Beta, math.multiply(math.transpose(X), math.transpose(y))) - Math.pow(ysum, 2) / n;
            var SST = SSE + SSR;
            var DFE = n - p;
            var DFR = p - 1;
            var DFT = DFE + DFR;
            var MSE = SSE / DFE;
            var MSR = SSR / DFR;
            // Find statistics
            Rsq = 1 - SSE / SST;
            Rsq_adj = 1 - MSE / (SST / DFT);
            F = MSR / MSE;
            
            // Change values in tables
            //Equation, s, and R-sq
            equation = respname + ' = ' + Beta[0].toFixed(precision);
            for (i = 1; i < numvar; i++) {
                if (Beta[i] < 0) {
                    equation += ' - ' + Math.abs(Beta[i]).toFixed(precision) + ' ' + varsnames[i-1];
                } else {
                    equation += ' + ' + Beta[i].toFixed(precision) + ' ' + varsnames[i-1];
                }
            }
            $('#eq').text(equation);
            $('#eq_S').text('S = ' + Math.sqrt(MSE).toFixed(precision));
            $('#eq_R').text('R-Sq = ' + Rsq.toFixed(precision));
            $('#eq_Radj').text('R-Sq (adj) = ' + Rsq_adj.toFixed(precision));
            // Intercept
            var T = Beta[0] / Math.sqrt(MSE * C[0][0]);
            var P = 2 * jStat.studentt.cdf(-Math.abs(T), DFE);
            $('#intercept_name').text('Intercept');
            $('#intercept_coeff').text(Beta[0].toFixed(precision));
            $('#intercept_se').text(Math.sqrt(MSE * C[0][0]).toFixed(precision));
            $('#intercept_t').text(T.toFixed(precision));
            $('#intercept_p').text(P.toFixed(precision));
            $('#intercept_vif').text(C[0][0].toFixed(precision));
            // Variables
            for (i = 1; i < numvar; i++) {
                T = Beta[i] / Math.sqrt(MSE * C[i][i]);
                P = 2 * jStat.studentt.cdf(-Math.abs(T), DFE);
                $('#Var' + i + '_name').text(varsnames[i-1]);
                $('#Var' + i + '_coeff').text(Beta[i].toFixed(precision));
                $('#Var' + i + '_se').text(Math.sqrt(MSE * C[i][i]).toFixed(precision));
                $('#Var' + i + '_t').text(T.toFixed(precision));
                $('#Var' + i + '_p').text(P.toFixed(precision));
                $('#Var' + i + '_vif').text(C[i][i].toFixed(precision));
            }
            
            // ANOVA table
            $('#Fanova').text('F = ' + F.toFixed(precision));
            $('#Panova').text('P = ' + jStat.ftest(F, DFR, DFE).toFixed(precision));
            $('#Reg_DOF').text(DFR);
            $('#Reg_SS').text(SSR.toFixed(precision));
            $('#Reg_MS').text(MSR.toFixed(precision));
            $('#Err_DOF').text(DFE);
            $('#Err_SS').text(SSE.toFixed(precision));
            $('#Err_MS').text(MSE.toFixed(precision));
            $('#Tot_DOF').text(DFT);
            $('#Tot_SS').text(SST.toFixed(precision));
            $('#Tot_MS').text('');
            
            
            $("#stat").show( "slow", function() {
            // Animation complete.
            });
            
            regDone = true;
            
            
            // Test data
            var testme = respname + ": " + respdata.toString() + "\n";
            for (i = 1; i < varsdata.length; i++) {
                testme += varsnames[i - 1] + ": " + varsdata[i].toString() + "\n";
            }
            
            testme += "Intercept = " + Beta[0] + "\n";
            testme += "Slope = " + Beta[1] + "\n";
            testme += "SSE = " + SSE + " and DFE = " + DFE + "\n";
            testme += "SSR = " + SSR + " and DFR = " + DFR + "\n";
            testme += "SST = " + SST + " and DFT = " + DFT + "\n";
            testme += "R-sq = " + Rsq + "\nR-sq adj = " + Rsq_adj + "\n";
            testme += "F = " + F + "\n";
            
            $("#test").text(testme);
        }
        catch(err) {
            alert(err);
        }
    });  // End regression click
    
    
    // Plot for two variables
    $('#plotData').click(function() {
        try {
            var err = "Error: Please do the regression analysis first (click on Regression).";
            if (!regDone) {
                throw err;
            }
            if (varsnames.length != numvar - 1) {
                throw err;
            }
            if (varsdata.length != numvar) {
                throw err;
            }
            
            if (numvar == 2) {
                $("#plotvsdiv").hide();
            } else {
                $("#plotvsdiv").show();
                // Naming radio buttons
                $("#plotprompt").text('Plot ' + respname + ' vs.');
                for (i = 0; i < numvar; i++) {
                    $('#Var' + i + '_span').text(varsnames[i-1] + ' ');
                }
            }
            // Find data
            var choice = $('input:radio[name=plotvs]:checked').val();
            var scatter = [];
            for (i = 0; i < respdata.length; i++) {
                scatter.push([varsdata[choice][i], respdata[i]]);
            }
            var start = Math.min.apply(null, varsdata[choice]);
            var end = Math.max.apply(null, varsdata[choice]);
            var line = [[start, Beta[0] + Beta[choice] * start],[end, Beta[0] + Beta[choice] * end]];
            var scatterdata = {
                label: "Observations",
                data: scatter,
                points: {show: true}
            };
            var linedata = {
                label: "Fit line",
                data: line,
                lines: {show: true}
            };
            var data = [scatterdata, linedata];
            var options = {
                xaxis:
                    {
                        min: start - (end - start) / 20,
                        max: end + (end - start) / 20
                    }
            };
            
            $("#plotcontainer").show( "slow", function() {
                //Plot data
                $.plot("#plot", data, options);
            });
            
            testme = scatter + '\n' + line + '\n';
            $("#test").text(testme);
            
        }
        catch(err) {
            alert(err);
        }
        
    });
    
    $('#plotbuttons').click(function() {
        $('#plotData').click();
    });

});

