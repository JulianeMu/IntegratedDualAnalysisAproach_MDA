function create_bullseye() {
    let width = "100%";
    let height = "auto";

    const svg = d3.select("#bullseye").append("svg")
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

    $.ajax({
        url: "http://127.0.0.1:5000/get_bullseye/",
        type: "POST",
        contentType: "application/json",
    }).done(function (response) { //response = [colordata, max, min]
        let colorData = response[0]
        let colorScale = d3.scaleSequential([response[2], response[1]],d3.interpolateViridis);

        var rnm1 = 0;
        var rnm2 = 0;
        var rn = r0;

        for (let n = 1; n < n_levels; n++) {
            rnm2 = n > 1 ? rnm1 : 0;
            rnm1 = n > 0 ? rn : 0;
            rn =
                n > 0
                    ? Math.sqrt((k + 1) * Math.pow(rnm1, 2) - k * Math.pow(rnm2, 2))
                    : r0;

            console.log(n, rn, rnm1, rnm2, sigma0);
            let arcs = Array(sigma0)
                .fill(1)
                .map((v, i) => {
                    return [{
                        innerRadius: rnm1,
                        outerRadius: rn,
                        startAngle: (2 * Math.PI * i) / sigma0,
                        endAngle: (2 * Math.PI * (i + 1)) / sigma0
                    },n,i]; //arc, level, index
                });

            pie
                .append('g')
                .attr('class', `level_${n}`)
                .selectAll('path')
                .data(arcs)
                .join('path')
                .attr("d", d => this_arc(d[0]))
                .attr('fill', (d, i) => colorScale(colorData[d[1]][d[2]]))
                .attr('stroke', 'black')
                .on("click", (d,i) => {
                    console.log(d[1],d[2]);
                });
        }

        tippy_instances_bullseye = tippy(svg.selectAll("path").nodes(),{followCursor:true});
        tippy_instances_bullseye.forEach((x,i) => {
            x.setContent(colorData[x.reference.__data__[1]][x.reference.__data__[2]]);
        })

        // labels
        for (let n = n_levels; n <= n_levels; n++) {
            rnm2 = n > 1 ? rnm1 : 0;
            rnm1 = n > 0 ? rn : 0;
            rn =
                n > 0
                    ? Math.sqrt((k + 1) * Math.pow(rnm1, 2) - k * Math.pow(rnm2, 2))
                    : r0;

            console.log(n, rn, rnm1, rnm2, sigma0);
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
                4: "Bgit",
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
                    return (rn-txt_offset)*Math.sin((9-(i+5))*theta)-2
                })
                .attr("y", function (d,i) {
                    return (rn-txt_offset)*Math.cos((9-(i+5))*theta)+txt_offset/2-2
                })
                .text(function (d,i) {
                    return labelmapping[i]
                })
                .attr("text-anchor","middle")
                .attr("font-size","10px")
                .attr("transform", function (d,i) {
                    let target_angle = 0;
                    if (i >= 3 && i < 7) {
                        target_angle = (d[0].startAngleDegree + d[0].endAngleDegree) / 2 + 180
                        return "rotate(" + target_angle + "," + ((rn-txt_offset)*Math.sin((9-(i+5))*theta)-2) + "," + ((rn-txt_offset)*Math.cos((9-(i+5))*theta)+txt_offset/2-2) + ")"
                    } else {
                        target_angle = (d[0].startAngleDegree + d[0].endAngleDegree) / 2
                        return "rotate(" + target_angle + "," + ((rn-txt_offset)*Math.sin((9-(i+5))*theta)-2) + "," + ((rn-txt_offset)*Math.cos((9-(i+5))*theta)+txt_offset/2-2) + ")"
                    }
                })
        }

        //pie.filter()
        //.style("cursor", "pointer")
        //.on("click", clicked);

        return svg.node();
    })
}