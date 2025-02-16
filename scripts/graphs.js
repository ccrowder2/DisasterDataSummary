import { disastersByFipsSince1968 } from './script.js';
import { getStateAbbreviationByFips } from './script.js';
import { disastersByFipsTypes } from "./script.js";
import { getAverageDisastersPerMonth } from "./script.js"

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

export function createPieChartForTypes(fipsStateCode) {
    const data = disastersByFipsTypes(fipsStateCode);
    
    if (!data || Object.keys(data).length === 0) {
        console.warn("No data available for the given FIPS code");
        return;
    }

    // Convert data into an array of objects
    const dataEntries = Object.entries(data).map(([type, count]) => ({
        type,
        count
    }));

    // Calculate total disasters for percentage calculation
    const totalDisasters = dataEntries.reduce((sum, d) => sum + d.count, 0);

    // Chart dimensions
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height - 50) / 2;

    // Select the chart container
    const container = d3.select("#svg-container2");

    // Remove previous content
    container.select("svg").remove();
    container.select("#tooltip").remove();

    // Create SVG
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Create pie generator
    const pie = d3.pie().value(d => d.count);
    const pieData = pie(dataEntries);

    // Define arc generator
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius * 0.8); // Positions labels inside

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "5px 10px")
        .style("border", "1px solid #ddd")
        .style("border-radius", "5px")
        .style("box-shadow", "0px 0px 5px rgba(0,0,0,0.3)")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // Draw slices
    svg.selectAll("path")
        .data(pieData)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.type))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .on("mouseover", function (event, d) {
            const percentage = ((d.data.count / totalDisasters) * 100).toFixed(2);
            tooltip.style("opacity", 1)
                .html(`<strong>${d.data.type}</strong><br>${percentage}%`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");

            d3.select(this).style("opacity", 0.7); // Highlight slice
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("opacity", 0);
            d3.select(this).style("opacity", 1); // Restore opacity
        });

    // Add labels **only for slices larger than 5%**
    svg.selectAll("text")
        .data(pieData)
        .enter()
        .append("text")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`) // Position text inside the slice
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "white") // White text for contrast
        .style("font-weight", "bold")
        .style("text-shadow", "1px 1px 3px rgba(0,0,0,0.5)") // Small shadow for visibility
        .text(d => {
            const percentage = (d.data.count / totalDisasters) * 100;
            return percentage > 15 ? `${d.data.type}\n${percentage.toFixed(1)}%` : ""; // Show type + % if > 5%
        });
}

export function createBarChartForMonthlyAverageByState(fipsStateCode) {
    // Fetch the data
    const averageData = getAverageDisastersPerMonth(fipsStateCode);

    // Convert object to array
    const data = Object.entries(averageData).map(([month, average]) => ({
        month: month,
        average: parseFloat(average)
    }));

    // Sort data by month order (ensures Jan - Dec order)
    data.sort((a, b) => parseInt(a.month) - parseInt(b.month));

    // Get container size dynamically
    const container = document.getElementById("svg-container4");
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Set margins similar to the line chart
    const marginTop = 100;
    const marginRight = 100;
    const marginBottom = 50;
    const marginLeft = 60;

    // Remove previous chart if any
    d3.select("#svg-container4").selectAll("*").remove();

    // Create SVG container with dynamic size
    const svg = d3.select("#svg-container4")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", `max-width: 100%; height: auto; background-color: none;`);

    // Define scales
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([marginLeft, width - marginRight])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.average)]) // Y-axis uses max average disasters
        .nice()
        .range([height - marginBottom, marginTop]);

    // Create bars with animation
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.month))
        .attr("y", height - marginBottom) // Start at bottom
        .attr("width", xScale.bandwidth())
        .attr("height", 0) // Start with no height
        .attr("fill", "#007bff")
        .transition()
        .duration(1000)
        .attr("y", d => yScale(d.average))
        .attr("height", d => height - marginBottom - yScale(d.average));

    // Add X-axis
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d => {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return monthNames[parseInt(d) - 1]; // Convert "01", "02" to "Jan", "Feb"
        }))
        .selectAll(".tick text")
        .style("text-anchor", "middle")
        .style("font-size", "12px");

    // Add Y-axis
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(yScale).ticks(10))
        .call(g => g.select(".domain").remove())
        .selectAll(".tick text")
        .style("font-size", "12px");

    // Add graph title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", marginTop / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text(`Avg Monthly Disasters in ${getStateAbbreviationByFips(fipsStateCode)}`);

    // Tooltip setup
    const tooltip = d3.select("#svg-container4")
        .append("div")
        .style("position", "absolute")
        .style("background", "lightgray")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("display", "none");

    // Add hover effects for tooltips
    svg.selectAll("rect")
        .on("mouseover", function (event, d) {
            tooltip.style("display", "block")
                .html(`<strong>Month:</strong> ${d.month}<br><strong>Avg Disasters:</strong> ${d.average}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
            d3.select(this).attr("fill", "#0056b3"); // Darken bar on hover
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
            d3.select(this).attr("fill", "#007bff"); // Restore original color
        });
}