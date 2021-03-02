function create_bullseye(target, colorData, min, max, colorScheme, labels = true) {
    let width = "100%";
    let height = "auto";

    d3.select(target).selectAll("*").remove()
    const svg = d3.select(target).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "-120 -120 240 240"); // position and size

    const pie = svg
        .append('g')
        //.attr('transform', `translate(${width / 2}, ${height / 2})`);

    let n_levels = 5; // number of concentrical levels*/
    let sigma0 = 9; // number of initial slices
    let k = 1.5; // sigma_n = sigma0 * k**n
    let r0 = 25; // initial radius

    let this_arc = d3.arc();

    let colorScale = d3.scaleSequential([min, max],colorScheme);

    var rnm1 = 0;
    var rnm2 = 0;
    var rn = r0;

    var all_arcs = [];

    for (let n = 1; n < n_levels; n++) {
        rnm2 = n > 1 ? rnm1 : 0;
        rnm1 = n > 0 ? rn : 0;
        rn =
            n > 0
                ? Math.sqrt((k + 1) * Math.pow(rnm1, 2) - k * Math.pow(rnm2, 2))
                : r0;

        //console.log(n, rn, rnm1, rnm2, sigma0);
        let arcs = Array(sigma0)
            .fill(1)
            .map((v, i) => {
                return [{
                    innerRadius: rnm1,
                    outerRadius: rn,
                    startAngle: (2 * Math.PI * i) / sigma0,
                    endAngle: (2 * Math.PI * (i + 1)) / sigma0
                },n,i,0]; //arc, level, index, is active
            });
        arcs.forEach((x) => {
            all_arcs.push(x)
        })
    }

    let paths = pie
        .append('g')
        //.attr('class', `level_${n}`)
        .selectAll('path')
        .data(all_arcs)
        .join('path');

    paths._groups[0].forEach((x) => bullseye_paths.push(x))

    paths.attr("d", d => this_arc(d[0]))
    .attr('fill', (d, i) => colorScale(colorData[d[1]][d[2]]))
    .attr('stroke', 'grey')
    .on("click", (d,i) => {
        console.log(d[1],d[2]);
        var elements = bullseye_paths.filter((x) => x.__data__[1] === d[1] && x.__data__[2] === d[2]) //lobes & shells
        if (d[3] === 1) { //if is active
            d[3] = 0;
            elements.forEach((element) => {
                element.setAttribute("stroke", "grey")
                d3.select(element).lower()
                element.__data__[3] = 0
            })
            bullseyecell_to_parcellationmesh[d[1]][d[2]].visible = false
            selected_parcellations[d[1]][d[2]] = false
            mesh.visible = !checkIfSelected() && mesh.opacity !== 0
        } else {
            d[3] = 1;
            elements.forEach((element) => {
                element.setAttribute("stroke", "black")
                d3.select(element).raise()
                element.__data__[3] = 1
            })
            bullseyecell_to_parcellationmesh[d[1]][d[2]].visible = true
            selected_parcellations[d[1]][d[2]] = true
            mesh.visible = false
        }
    show2DParcels()
    });

    tippy_instances_bullseye = tippy(svg.selectAll("path").nodes(),{followCursor:true});
    tippy_instances_bullseye.forEach((x,i) => {
        x.setContent(colorData[x.reference.__data__[1]][x.reference.__data__[2]].toFixed(2));
    })

    // labels
    if (labels) {
        for (let n = n_levels; n <= n_levels; n++) {
            rnm2 = n > 1 ? rnm1 : 0;
            rnm1 = n > 0 ? rn : 0;
            rn =
                n > 0
                    ? Math.sqrt((k + 1) * Math.pow(rnm1, 2) - k * Math.pow(rnm2, 2))
                    : r0;

            //console.log(n, rn, rnm1, rnm2, sigma0);
            let arcs = Array(sigma0)
                .fill(1)
                .map((v, i) => {
                    return [{
                        innerRadius: rnm1,
                        outerRadius: rn,
                        startAngle: (2 * Math.PI * i) / sigma0,
                        endAngle: (2 * Math.PI * (i + 1)) / sigma0,
                        startAngleDegree: (2 * Math.PI * i) / sigma0 * 180 / Math.PI,
                        endAngleDegree: (2 * Math.PI * (i + 1)) / sigma0 * 180 / Math.PI
                    },n,i]; //arc, level, index
                });

            labelmapping = {
                0: "Front",
                1: "Par",
                2: "Temp",
                3: "Occ",
                4: "BGIT",
                5: "Occ",
                6: "Temp",
                7: "Par",
                8: "Front"
            }

            let txt_offset = 12
            var theta = 2*Math.PI/arcs.length
            pie
                .append('g')
                .attr('class', `level_${n}`)
                .selectAll('text')
                .data(arcs)
                .join('text')
                .attr("x", function (d,i) {
                    return (rn-txt_offset)*Math.sin((9-(i+5))*theta)//-2
                })
                .attr("y", function (d,i) {
                    return (rn-txt_offset)*Math.cos((9-(i+5))*theta)//+txt_offset/2-2
                })
                .text(function (d,i) {
                    return labelmapping[i]
                })
                .attr("text-anchor","middle")
                .attr("font-size","16px")
                .attr("alignment-baseline", "middle")
                .attr("transform", function (d,i) {
                    let target_angle = 0;
                    if (i >= 3 && i < 7) {
                        target_angle = (d[0].startAngleDegree + d[0].endAngleDegree) / 2 + 180
                        //return "rotate(" + target_angle + "," + ((rn-txt_offset)*Math.sin((9-(i+5))*theta)-2) + "," + ((rn-txt_offset)*Math.cos((9-(i+5))*theta)+txt_offset/2-2) + ")"
                    } else {
                        target_angle = (d[0].startAngleDegree + d[0].endAngleDegree) / 2
                        //return "rotate(" + target_angle + "," + ((rn-txt_offset)*Math.sin((9-(i+5))*theta)-2) + "," + ((rn-txt_offset)*Math.cos((9-(i+5))*theta)+txt_offset/2-2) + ")"
                    }
                    return "rotate(" + target_angle + "," + ((rn-txt_offset)*Math.sin((9-(i+5))*theta)) + "," + ((rn-txt_offset)*Math.cos((9-(i+5))*theta)) + ")"
                })
        }
    }


        //pie.filter()
        //.style("cursor", "pointer")
        //.on("click", clicked);

    return svg.node();
}

function initialize_bullseyeplot() {
    $.ajax({
        url: "http://127.0.0.1:5000/get_bullseye/0",
        type: "POST",
        contentType: "application/json",
    }).done(function (response) {
        showSingleBullseye(response)
    })
}

function checkIfSelected() {
    for (let shell = 1; shell<= 4; shell++){
        for (let lobe = 0; lobe <= 8; lobe++){
            if (selected_parcellations[shell][lobe] === true)
                    return true
        }
    }
    return false
}