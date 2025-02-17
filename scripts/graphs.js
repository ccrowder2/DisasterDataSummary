import { disastersByFipsSince1968 } from './script.js';
import { getStateAbbreviationByFips } from './script.js';
import { disastersByFipsTypes } from "./script.js";
import { getAverageDisastersPerMonth } from "./script.js"
import { getAverageDisastersPerYearByCounty } from "./script.js"
import { disastersByCountyFipsSince1968 } from "./script.js"
import { getCountyNameByFips } from "./script.js"

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
            return percentage > 15 ? `${d.data.type} - ${percentage.toFixed(1)}%` : ""; // Show type + % if > 5%
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

    } catch (error) {
        console.error("Error loading GeoJSON:", error);
    }
}
