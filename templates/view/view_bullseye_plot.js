function create_bullseye() {
    let width = "100%";
    let height = "auto";

    const svg = d3.select("#bullseye").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "-100 -100 200 200"); // position and size

    const pie = svg
        .append('g')
        //.attr('transform', `translate(${width / 2}, ${height / 2})`);

    let n_levels = 5; // number of concentrical levels*/
    let sigma0 = 7; // number of initial slices
    let k = 1.5; // sigma_n = sigma0 * k**n
    let r0 = 25; // initial radius

    let this_arc = d3.arc();
    let colorScale = d3.scaleSequential([-1,1], d3.interpolateViridis);

    let colorData = {
        1: {
            0: 0.1,
            1: 0.2,
            2: 0.3,
            3: 0.4,
            4: 0.5,
            5: 0.6,
            6: 1.0,
        },
        2: {
            0: -0.1,
            1: -0.2,
            2: -0.3,
            3: -0.4,
            4: -0.5,
            5: -0.6,
            6: -0.7,
        },
        3: {
            0: 0.1,
            1: 0.2,
            2: 0.3,
            3: 0.4,
            4: 0.5,
            5: 0.6,
            6: 1.0,
        },
        4: {
            0: -0.1,
            1: -0.2,
            2: -0.3,
            3: -0.4,
            4: -0.5,
            5: -0.6,
            6: -0.7,
        }
    };


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

    //pie.filter()
        //.style("cursor", "pointer")
        //.on("click", clicked);

    return svg.node();
}