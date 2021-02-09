function ramp(color, n = 256) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    for (let i = 0; i < n; ++i) {
        context.fillStyle = color(i / (n - 1));
        context.fillRect(i, 0, 20, 300);
    }
    return canvas;
}

function legend({
                    target,
                    color,
                    title,
                    tickSize = 6,
                    width = 320,
                    height = 44 + tickSize,
                    marginTop = 18,
                    marginRight = 0,
                    marginBottom = 16 + tickSize,
                    marginLeft = 0,
                    ticks = width / 64,
                    tickFormat,
                    tickValues
                } = {}) {

        svg = d3.select(target).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .style("overflow", "visible")
            .style("display", "block");

    let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
    let x;

    // Continuous
    if (color.interpolate) {
        const n = Math.min(color.domain().length, color.range().length);

        x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

        svg.append("canvas")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("preserveAspectRatio", "none")
            .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
    }

    // Sequential
    else if (color.interpolator) {
        x = Object.assign(color.copy()
                .interpolator(d3.interpolateRound(marginLeft, width - marginRight)),
            {range() { return [marginLeft, width - marginRight]; }});

        svg.append("image")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("preserveAspectRatio", "none")
            .attr("xlink:href", ramp(color.interpolator()).toDataURL());

        // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
        if (!x.ticks) {
            if (tickValues === undefined) {
                const n = Math.round(ticks + 1);
                tickValues = d3.range(n).map(i => d3.quantile(color.domain(), i / (n - 1)));
            }
            if (typeof tickFormat !== "function") {
                tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
            }
        }
    }

    // Threshold
    else if (color.invertExtent) {
        const thresholds
            = color.thresholds ? color.thresholds() // scaleQuantize
            : color.quantiles ? color.quantiles() // scaleQuantile
                : color.domain(); // scaleThreshold

        const thresholdFormat
            = tickFormat === undefined ? d => d
            : typeof tickFormat === "string" ? d3.format(tickFormat)
                : tickFormat;

        x = d3.scaleLinear()
            .domain([-1, color.range().length - 1])
            .rangeRound([marginLeft, width - marginRight]);

        svg.append("g")
            .selectAll("rect")
            .data(color.range())
            .join("rect")
            .attr("x", (d, i) => x(i - 1))
            .attr("y", marginTop)
            .attr("width", (d, i) => x(i) - x(i - 1))
            .attr("height", height - marginTop - marginBottom)
            .attr("fill", d => d);

        tickValues = d3.range(thresholds.length);
        tickFormat = i => thresholdFormat(thresholds[i], i);
    }

    // Ordinal
    else {
        x = d3.scaleBand()
            .domain(color.domain())
            .rangeRound([marginLeft, width - marginRight]);

        svg.append("g")
            .selectAll("rect")
            .data(color.domain())
            .join("rect")
            .attr("x", x)
            .attr("y", marginTop)
            .attr("width", Math.max(0, x.bandwidth() - 1))
            .attr("height", height - marginTop - marginBottom)
            .attr("fill", color);

        tickAdjust = () => {};
    }

    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x)
            .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
            .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
            .tickSize(tickSize)
            .tickValues(tickValues))
        .call(tickAdjust)
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
            .attr("x", marginLeft)
            .attr("y", marginTop + marginBottom - height - 6)
            .attr("fill", 'white')
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .attr("class", "title")
            .text(title));

    svg.selectAll("text").attr("fill", "white")
    return svg.node();
}



function swatches({
                      target,
                      color,
                      format = x => x,
                      swatchSize = 15,
                      swatchWidth = swatchSize,
                      swatchHeight = swatchSize,
                      marginLeft = 0
                  }) {
    const id = "swatch";

    $(target).children().remove();

    d = document.createElement("div");
    d.style.display = "grid";
    d.style.alignItems= "center";
    d.style.minHeight = "33px";
    d.style.marginLeft =  marginLeft + "px";
    d.style.fontSize = "10px";
    d.style.fontFamily = "sans-serif";

    // move this to global css
    styles = `<style>
    .swatch {
            display: inline-flex;
            align-items: center;
            margin-right: 1em;
        }

    .swatch::before {    
            content: "|";
            display: inline-flex;
            width: ${+swatchWidth}px;
            height: ${+swatchHeight}px;
            margin-right: 0.5em;
            background: var(--color);
            color: var(--color);
        }
    </style>`;

    // can be left out when the previous stuff has been moved
    var styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // adds the swatches
    $(target).prepend(d);
    color.domain().map( (value) => {
        s = document.createElement("span");
        s.className = "swatch";
        s.style.setProperty("--color", `${color(value)}`);
        s.style.marginRight = "1em";
        s.style.fontSize = swatchHeight-3 + "px";
        s.style.marginTop = "1em";
        s.appendChild(document.createTextNode(format(value)));
        d.appendChild(s);
    });
}