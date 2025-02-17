import { disastersByFipsSince1968 } from './script.js';
import { getStateAbbreviationByFips } from './script.js';
import { disastersByFipsTypes } from "./script.js";
import { getAverageDisastersPerMonth } from "./script.js"
import { getAverageDisastersPerYearByCounty } from "./script.js"
import { disastersByCountyFipsSince1968 } from "./script.js"
import { getCountyNameByFips } from "./script.js"
import { getAverageCountyDisastersPerMonth } from "./script.js"
import { disasterTypesByFipsCounty } from "./script.js"

export async function createDisastersStackedAreaChart(fipsStateCode, fipsCountyCode) {
    // Fetch state and county disaster data
    const disastersByStateYear = disastersByFipsSince1968(fipsStateCode);
    const disastersByCountyYear = disastersByCountyFipsSince1968(fipsStateCode, fipsCountyCode);

    // Get all years and ensure missing years are included
    const allYears = new Set([...Object.keys(disastersByStateYear), ...Object.keys(disastersByCountyYear)].map(Number));

    const stateData = Array.from(allYears).map(year => ({
        year,
        count: disastersByStateYear[year] || 0
    }));

    const countyData = Array.from(allYears).map(year => ({
        year,
        count: disastersByCountyYear[year] || 0
    }));

    stateData.sort((a, b) => a.year - b.year);
    countyData.sort((a, b) => a.year - b.year);

    // Merge state and county data
    const mergedData = stateData.map((state, index) => ({
        year: state.year,
        state: state.count,
        county: countyData[index] ? countyData[index].count : 0
    }));

    // Remove previous chart
    d3.select("#svg-container1").selectAll("*").remove();

    // Fetch GeoJSON for county names
    const geojsonUrl = `https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json`;
    const geoData = await d3.json(geojsonUrl);

    // Function to get county name
    function getCountyName(fipsStateCode, fipsCountyCode) {
        const fullFips = `${fipsStateCode}${fipsCountyCode.padStart(3, "0")}`;
        const countyFeature = geoData.features.find(feature => feature.properties.FIPS === fullFips);
        return countyFeature ? countyFeature.properties.NAME : "Unknown County";
    }

    // Get state abbreviation
    function getStateName(fipsStateCode) {
        return getStateAbbreviationByFips(fipsStateCode);
    }

    // Get container size dynamically
    const container = document.getElementById("svg-container1");
    const width = container.clientWidth;
    const height = container.clientHeight;

    const marginTop = 50;
    const marginRight = 100;
    const marginBottom = 50;
    const marginLeft = 70;

    // Define scales
    const x = d3.scaleLinear()
        .domain(d3.extent(mergedData, d => d.year))
        .range([marginLeft, width - marginRight]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(mergedData, d => d.state + d.county)])
        .range([height - marginBottom, marginTop]);

    // Create SVG container
    const svg = d3.select("#svg-container1")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height + 40}`) // Extra space for title
        .attr("style", `max-width: 100%; height: auto; background-color: none;`);

    // Add Title Above the Chart
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", marginTop / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text(`Natural Disasters in ${await getCountyNameByFips(fipsStateCode, fipsCountyCode)} County, ${getStateName(fipsStateCode)} Since 1968`);

    // Tooltip
    const tooltip = d3.select("#svg-container1")
        .append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid black")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("display", "none");

    // Crosshair
    const crosshair = svg.append("line")
        .attr("stroke", "black")
        .attr("stroke-dasharray", "4")
        .attr("visibility", "hidden");

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y));

    // Stack data
    const stack = d3.stack().keys(["county", "state"]);
    const stackedData = stack(mergedData);

    // Define area generator
    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    // Add stacked areas
    svg.selectAll(".area")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "area")
        .attr("fill", (d, i) => i === 0 ? "#98C9E8" : "#2E8B57")
        .attr("pointer-events", "all")
        .attr("d", area);

    // Add Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 120}, 20)`);

    const legendData = [
        { name: "State", color: "#2E8B57" },
        { name: "County", color: "#98C9E8" }
    ];

    legendData.forEach((d, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d.color);

        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 12)
            .text(d.name)
            .style("font-size", "12px");
    });

    // Crosshair Interaction
    svg.on("mousemove", async function (event) {
        const [mouseX] = d3.pointer(event);
        const closestYear = Math.round(x.invert(mouseX));
        const yearData = mergedData.find(d => d.year === closestYear);

        if (yearData) {
            crosshair.attr("x1", x(closestYear))
                .attr("x2", x(closestYear))
                .attr("y1", marginTop)
                .attr("y2", height - marginBottom)
                .attr("visibility", "visible");

            const countyName = await getCountyNameByFips(fipsStateCode, fipsCountyCode);
            const stateName = getStateName(fipsStateCode);

            tooltip.style("display", "block")
                .html(`<strong>Year:</strong> ${closestYear}<br>
                       <strong>${stateName} Disasters:</strong> ${yearData.state}<br>
                       <strong>${countyName} County Disasters:</strong> ${yearData.county}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        }
    });

    svg.on("mouseout", function () {
        crosshair.attr("visibility", "hidden");
        tooltip.style("display", "none");
    });
}

// State Pie Chart
export function createPieChartForStateTypes(fipsStateCode) {
    const data = disastersByFipsTypes(fipsStateCode);
    
    if (!data || Object.keys(data).length === 0) {
        console.warn("No data available for the given FIPS code");
        return;
    }

    const dataEntries = Object.entries(data).map(([type, count]) => ({ type, count }));
    const totalDisasters = dataEntries.reduce((sum, d) => sum + d.count, 0);

    const width = 400;
    const height = 425; // Match county chart size
    const radius = Math.min(width, height - 100) / 2;

    const container = d3.select("#svg-container2");
    container.select("svg").remove();
    container.select("#tooltip").remove();
    container.select("#chart-title").remove();

    container.append("h3")
    .attr("id", "chart-title")
    .style("margin", "0 auto")
    .style("text-align", "center")
    .style("width", "100%")
    .style("padding", "5px 0") // Reduce padding to pull the chart up
    .text(`Disaster Types in ${getStateAbbreviationByFips(fipsStateCode)}`);

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2.5})`);

    const pie = d3.pie().value(d => d.count);
    const pieData = pie(dataEntries);

    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius * 0.8);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

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

            d3.select(this).style("opacity", 0.7);
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("opacity", 0);
            d3.select(this).style("opacity", 1);
        });

    svg.selectAll("text")
        .data(pieData)
        .enter()
        .append("text")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "white")
        .style("font-weight", "bold")
        .style("text-shadow", "1px 1px 3px rgba(0,0,0,0.5)")
        .text(d => {
            const percentage = (d.data.count / totalDisasters) * 100;
            return percentage > 10 ? d.data.type : null;
        });
}        

// County Pie Chart
export async function createPieChartForCountyTypes(fipsStateCode, fipsCountyCode) {
    const data = disasterTypesByFipsCounty(fipsStateCode, fipsCountyCode);
    
    if (!data || Object.keys(data).length === 0) {
        console.warn("No data available for the given FIPS code");
        return;
    }

    const dataEntries = Object.entries(data).map(([type, count]) => ({ type, count }));
    const totalDisasters = dataEntries.reduce((sum, d) => sum + d.count, 0);

    const width = 400;
    const height = 425; // Match county chart size
    const radius = Math.min(width, height - 100) / 2;

    const container = d3.select("#svg-container3");
    container.select("svg").remove();
    container.select("#tooltip").remove();
    container.select("#chart-title").remove();

    container.append("h3")
    .attr("id", "chart-title")
    .style("margin", "0 auto")
    .style("text-align", "center")
    .style("width", "100%")
    .style("padding", "5px 0") // Reduce padding to pull the chart up
    .text(`Disaster Types in ${await getCountyNameByFips(fipsStateCode,fipsCountyCode)} County`);

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2.5})`);

    const pie = d3.pie().value(d => d.count);
    const pieData = pie(dataEntries);

    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius * 0.8);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

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

            d3.select(this).style("opacity", 0.7);
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("opacity", 0);
            d3.select(this).style("opacity", 1);
        });

    svg.selectAll("text")
        .data(pieData)
        .enter()
        .append("text")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "white")
        .style("font-weight", "bold")
        .style("text-shadow", "1px 1px 3px rgba(0,0,0,0.5)")
        .text(d => {
            const percentage = (d.data.count / totalDisasters) * 100;
            return percentage > 10 ? d.data.type : null;
        });
} 

export function createBarChartForMonthlyAverageByStateAndCounty(fipsStateCode, fipsCountyCode) {
    // Fetch the data for the state and county
    const stateAverageData = getAverageDisastersPerMonth(fipsStateCode);
    const countyAverageData = getAverageCountyDisastersPerMonth(fipsStateCode, fipsCountyCode);

    // Convert object to array for both state and county
    const stateData = Object.entries(stateAverageData).map(([month, average]) => ({
        month: month,
        average: parseFloat(average),
        type: 'State'
    }));

    const countyData = Object.entries(countyAverageData).map(([month, average]) => ({
        month: month,
        average: parseFloat(average),
        type: 'County'
    }));

    // Merge state and county data
    const data = [...stateData, ...countyData];

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

    // Define color scale for state and county
    const colorScale = d3.scaleOrdinal()
        .domain(['State', 'County'])
        .range(['purple', '#00BFFF']); // Tomato for State, LimeGreen for County

    // Create bars with animation
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.month) + (d.type === 'County' ? xScale.bandwidth() / 2 : 0)) // Offset county bars
        .attr("y", height - marginBottom) // Start at bottom
        .attr("width", xScale.bandwidth() / 2) // Set width for side-by-side bars
        .attr("height", 0) // Start with no height
        .attr("fill", d => colorScale(d.type))
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
        .text(`Average Natural Disasters By Month in ${getStateAbbreviationByFips(fipsStateCode)} Since 1968`);

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
        .on("mouseover", async function (event, d) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const name = d.type === 'State' ? getStateAbbreviationByFips(fipsStateCode) : await getCountyNameByFips(fipsStateCode,fipsCountyCode);
            tooltip.style("display", "block")
                .html(`<strong>Month:</strong> ${monthNames[parseInt(d.month) - 1]}<br><strong>Avg Disasters:</strong> ${d.average}<br><strong>${d.type}:</strong> ${name}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
            d3.select(this).attr("fill", "#0056b3"); // Darken bar on hover
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
            d3.select(this).attr("fill", d => colorScale(d.type)); // Restore original color
        });

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - marginRight + 20}, ${marginTop})`);

    legend.selectAll("rect")
        .data(['State', 'County'])
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 30)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => colorScale(d));

    legend.selectAll("text")
        .data(['State', 'County'])
        .enter()
        .append("text")
        .attr("x", 30)
        .attr("y", (d, i) => i * 30 + 15)
        .style("font-size", "12px")
        .text(d => d);
}

export async function loadStateMap(fipsCode) {
    const width = 800, height = 600; // Large enough for clear visibility

    // Select the SVG and set dimensions
    const svg = d3.select("#state-map")
        .attr("width", width)
        .attr("height", height);

    // Clear previous map
    svg.selectAll("*").remove();

    // Remove any existing tooltip (prevents duplicates)
    d3.select("#tooltip").remove();

    // Create a tooltip div
    const tooltip = d3.select("body").append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid black")
        .style("padding", "5px")
        .style("font-size", "14px")
        .style("border-radius", "4px")
        .style("pointer-events", "none") // Prevents interference with mouse events
        .style("display", "none"); // Initially hidden

    // Load U.S. Counties GeoJSON
    const geojsonUrl = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";

    try {
        const geoData = await d3.json(geojsonUrl);

        // Filter only the selected state's counties
        const stateCounties = {
            type: "FeatureCollection",
            features: geoData.features.filter(d => d.properties.STATE === fipsCode)
        };

        if (stateCounties.features.length === 0) {
            console.error("No counties found for FIPS code:", fipsCode);
            return;
        }

        // Get average disasters per year for each county (using full 5-digit FIPS code)
        const countyDisasterAverages = getAverageDisastersPerYearByCounty(fipsCode);

        // Get the minimum and maximum values for the disaster averages
        const minDisasters = d3.min(Object.values(countyDisasterAverages));
        const maxDisasters = d3.max(Object.values(countyDisasterAverages));

        // Create a logarithmic color scale (this helps make small differences in the data more noticeable)
        const colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain([Math.log(minDisasters + 1), Math.log(maxDisasters + 1)]); // Log scale for enhanced contrast

        // Create a projection that fits the state inside the SVG
        const projection = d3.geoMercator().fitSize([width, height], stateCounties);
        const path = d3.geoPath().projection(projection);

        // Draw counties
        svg.selectAll("path")
            .data(stateCounties.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", function (d) {
                // Combine state and county FIPS code into a 5-digit code
                const countyFips = d.properties.STATE + d.properties.COUNTY;  // Full 5-digit FIPS code
                const avgDisasters = countyDisasterAverages[countyFips];

                // Color the counties based on the average disasters per year using the logarithmic scale
                return avgDisasters ? colorScale(Math.log(avgDisasters + 1)) : "#cccccc"; // Default gray if no data
            })
            .attr("stroke", "#000")  // Border color
            .attr("stroke-width", 1)
            .on("mouseover", function (event, d) {
                // Display tooltip with county name and average disasters
                const countyFips = d.properties.STATE + d.properties.COUNTY;  // Full 5-digit FIPS code
                const avgDisasters = countyDisasterAverages[countyFips];
                tooltip.style("display", "block")
                    .html(`<strong>${d.properties.NAME} County</strong><br>Average Disasters per Year: ${avgDisasters || 'No data'}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("display", "none"); // Hide tooltip
            });

        // Dynamically position the title with more space above the map
        const stateAbbreviation = getStateAbbreviationByFips(fipsCode);
        const titlePadding = 0;  // More padding for a taller title
        const titleYPosition = titlePadding;  // You can adjust this value to suit your needs

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", titleYPosition)
            .attr("text-anchor", "middle")
            .style("font-size", "22px")  // Adjust font size for a taller title
            .style("font-weight", "bold")
            .text(`Average Natural Disasters By County in ${stateAbbreviation}`);

        // Add the color scale legend on the right side of the map
        const legendWidth = 20;
        const legendHeight = 200;
        const legendMargin = 40;

        const legend = svg.append("g")
            .attr("transform", `translate(${width - legendMargin}, ${titlePadding + 20})`);  // Adjusted for space

        const legendScale = d3.scaleLinear()
            .domain([Math.log(minDisasters + 1), Math.log(maxDisasters + 1)])
            .range([0, legendHeight]);

        const legendAxis = d3.axisRight(legendScale)
            .ticks(5)
            .tickFormat(d => Math.round(Math.exp(d)));  // Convert back from log scale for easier reading

        legend.append("g")
            .call(legendAxis);

        // Add color rectangles to the legend to match the color scale
        const legendColors = d3.range(minDisasters, maxDisasters, (maxDisasters - minDisasters) / 5);
        legend.selectAll("rect")
            .data(legendColors)
            .enter().append("rect")
            .attr("x", -legendWidth)
            .attr("y", d => legendScale(Math.log(d + 1)))
            .attr("width", legendWidth)
            .attr("height", legendHeight / 5)
            .style("fill", d => colorScale(Math.log(d + 1)));

    } catch (error) {
        console.error("Error loading GeoJSON:", error);
    }
}