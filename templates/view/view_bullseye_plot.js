function create_bullseye() {
    let width = "300px";
    let height = "300px";

    const svg = d3.select("#bullseye").append("svg")
        .attr("width", width)
        .attr("height", height);

    const pie = svg
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);


    let n_levels = 3; // number of concentrical levels*/
    let sigma0 = 7; // number of initial slices
    let k = 2; // sigma_n = sigma0 * k**n
    let r0 = 57; // initial radius

    let this_arc = d3.arc();

    var rnm1 = 0;
    var rnm2 = 0;
    var rn = r0;

    for (let n = 0; n < n_levels; n++) {
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
                return {
                    innerRadius: rnm1,
                    outerRadius: rn,
                    startAngle: (2 * Math.PI * i) / sigma0,
                    endAngle: (2 * Math.PI * (i + 1)) / sigma0
                };
            });

        pie
            .append('g')
            .attr('class', `level_${n}`)
            .selectAll('path')
            .data(arcs)
            .join('path')
            .attr("d", d => this_arc(d))
            .attr('fill', 'purple')
            .attr('stroke', 'black');
    }

    //pie.filter()
        //.style("cursor", "pointer")
        //.on("click", clicked);

    return svg.node();
}

function clicked(event, p) {
    console.log("clicked");
}