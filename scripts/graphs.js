import { disastersByFipsSince1968 } from './script.js';
import { getStateAbbreviationByFips } from './script.js';

export async function createDisastersLineChart(fipsStateCode) {
    const disastersByYear = disastersByFipsSince1968(fipsStateCode);

    const data = Object.keys(disastersByYear).map(year => ({
        year: parseInt(year),
        count: disastersByYear[year]
    }));

    data.sort((a, b) => a.year - b.year);

    // Remove any existing elements in the container
    d3.select("#svg-container1").selectAll("*").remove();

    // Get the width and height of the container dynamically
    const container = document.getElementById("svg-container1");
    const width = container.clientWidth;
    const height = container.clientHeight;

    const marginTop = 100;
    const marginRight = 100;
    const marginBottom = 50;
    const marginLeft = 60;

    // x scale
    const x = d3.scaleLinear()
        .domain([d3.min(data, d => d.year), d3.max(data, d => d.year)])
        .range([marginLeft, width - marginRight]);

    // y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height - marginBottom, marginTop]);

    // svg container
    const svg = d3.select("#svg-container1")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", `max-width: 100%; height: auto; background-color: none;`);

    // Create axes
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")))
        .selectAll(".tick text")
        .style("text-anchor", "middle")
        .style("font-size", "12px");

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(10))
        .call(g => g.select(".domain").remove())
        .selectAll(".tick text")
        .style("font-size", "12px");

    // Define the line
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.count));

    // Define the area generator
    const area = d3.area()
        .x(d => x(d.year))
        .y0(height - marginBottom)  // Bottom of the SVG area
        .y1(d => y(d.count)); // The y-value of the line

    // Add area fill (color under the line)
    svg.append("path")
        .datum(data)
        .attr("fill", "rgba(70, 130, 180, 0.5)")
        .attr("d", area);

    // Line transition animation
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line)
        .attr("stroke-dasharray", function () { return this.getTotalLength(); })
        .attr("stroke-dashoffset", function () { return this.getTotalLength(); })
        .transition()
        .duration(2000)
        .attr("stroke-dashoffset", 0);

    // Tooltip setup
    const tooltip = d3.select("#svg-container1")
        .append("div")
        .style("position", "absolute")
        .style("background", "lightgray")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("display", "none");

    // Add circles (data points) with hover effects
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", 5)
        .attr("fill", "red")
        .attr("opacity", 0)
        .on("mouseover", (event, d) => {
            tooltip.style("display", "block")
                .html(`Year: ${d.year} <br> Disasters: ${d.count}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
            d3.select(event.target).attr("opacity", 1).attr("r", 8).attr("fill", "orange");
        })
        .on("mouseout", (event) => {
            tooltip.style("display", "none");
            d3.select(event.target).attr("opacity", 0).attr("r", 5).attr("fill", "red");
        });

    // Add graph title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", marginTop / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .text(`Natural Disasters in ${getStateAbbreviationByFips(fipsStateCode)} Since 1968`);
}