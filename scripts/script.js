import { fetchFEMADisasterDeclarationsSummariesSince1968 } from './apis.js';
import { createDisastersStackedAreaChart } from './graphs.js';
import { disastersByFips } from './apis.js';
import { createPieChartForStateTypes } from './graphs.js';
import { createBarChartForMonthlyAverageByStateAndCounty } from './graphs.js';
import { loadStateMap } from './graphs.js';
import { createPieChartForCountyTypes } from "./graphs.js"
window.handleOnLoad = async function handleOnLoad() {
    let insertFullFipCode = '12101';
    let stateCode = insertFullFipCode[0] + insertFullFipCode[1]
    let html = `
     <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item active">
                    <a class="nav-link" href="./index.html">Home</a>
                </li>
            </ul>
        </div>
    </nav>
      
    <div class="container-fluid">
    <div class="row">
        <div class="col-md-8 vh-100 overflow-auto">
            <div id="svg-container1">
                <p>Graph Loading</p>
            </div>

            <div class="row d-flex justify-content-between" id="row2">
                <div class="col-md-6">
                    <div id="svg-container2" class="chart-box">
                    </div>
                </div>
                <div class="col-md-6">
                    <div id="svg-container3" class="chart-box">
                    </div>
                </div>
            </div>

            <div id="svg-container4" class="chart-box">
            </div>
            <div id="svg-container5" class="chart-box">
                <h3 id="stateTitle">Average Annual Disasters by County in ${getStateAbbreviationByFips(stateCode)}</h3>
                <svg id="state-map"></svg>
            </div>
        </div>
        <div class="col-md-4 vh-100 overflow-auto">
            <div id="rowData"></div>
        </div>
    </div>
</div>
    `

    document.getElementById('main').innerHTML = html;
    await fetchAllAPIData()
    displayAllData(insertFullFipCode)
}

async function fetchAllAPIData() {
    await fetchFEMADisasterDeclarationsSummariesSince1968()
}

async function displayAllData(fipsCode){
    let fipsStateCode = fipsCode[0] + fipsCode[1]
    let fipsCountyCode = fipsCode[2] + fipsCode[3] + fipsCode[4]
    let view = false

    // State view = false; County View = true;
    if(view == false){
        createDisastersStackedAreaChart(fipsStateCode, fipsCountyCode)
        createPieChartForStateTypes(fipsStateCode)
        createPieChartForCountyTypes(fipsStateCode, fipsCountyCode)
        console.log(disasterTypesByFipsCounty(fipsStateCode,fipsCountyCode))
        createBarChartForMonthlyAverageByStateAndCounty(fipsStateCode,fipsCountyCode)
        loadStateMap(fipsStateCode)
        populateDataRows(fipsStateCode,fipsCountyCode)

    } else {
        // If view is in county
    }
}

const fipsToAbbreviation = {
    "01": "Alabama", "06": "California", "08": "Colorado", "12": "Florida", "13": "Georgia", 
    "16": "Idaho", "18": "Indiana", "20": "Kansas", "21": "Kentucky", "22": "Louisiana", 
    "29": "Missouri", "28": "Mississippi", "37": "North Carolina", "32": "Nevada", "33": "New Hampshire", 
    "45": "South Carolina", "47": "Tennessee", "48": "Texas", "49": "Utah", "51": "Virginia"
};

export async function getCountyNameByFips(stateFips, countyFips) {
    const geojsonUrl = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";
    let name = 'Unkown'
    const geoData = await d3.json(geojsonUrl);

    Object.values(geoData.features).forEach(obj => {
        if (obj.properties.STATE === stateFips && obj.properties.COUNTY === countyFips && obj.properties.NAME != undefined) {
            name = obj.properties.NAME
        }
    });
    return name
}

export function getStateAbbreviationByFips(fipsCode) {
    const abbreviation = fipsToAbbreviation[fipsCode];
    if (abbreviation) {
        return abbreviation;
    }
}

// Line Chart Data
// State data
export function disastersByFipsSince1968(fipsStateCode) {
    const disastersByYear = {};
    const disasters = disastersByFips[fipsStateCode];

    if (disasters) {
        const countedDisasterNumbers = new Set();

        Object.values(disasters).forEach(obj => {
            const year = obj.year;
            const disasterNumber = obj.disasterNumber; 

            if (!countedDisasterNumbers.has(disasterNumber)) {
                countedDisasterNumbers.add(disasterNumber);

                if (!disastersByYear[year]) {
                    disastersByYear[year] = 0;
                }

                disastersByYear[year] += 1;
            }
        });
    } else {
        console.log(`No disasters found for FIPS code: ${fipsStateCode}`);
    }
    return disastersByYear;
}

// County Data
export function disastersByCountyFipsSince1968(fipsStateCode, fipsCountyCode) {
    const disastersByYear = {};

    // Access the disasters for the specific state FIPS code
    const disasters = disastersByFips[fipsStateCode];

    if (disasters) {
        const countedDisasterNumbers = new Set();

        // Loop through all disaster records in the state
        Object.values(disasters).forEach(obj => {
            const year = obj.year;
            const disasterNumber = obj.disasterNumber;
            const countyCode = obj.fips_county_code;

            // Check if the county code matches the input county FIPS code
            if (countyCode === fipsCountyCode) {
                // Only count unique disaster numbers for the given county and year
                if (!countedDisasterNumbers.has(disasterNumber)) {
                    countedDisasterNumbers.add(disasterNumber);

                    // Initialize the year in disastersByYear if it doesn't already exist
                    if (!disastersByYear[year]) {
                        disastersByYear[year] = 0;
                    }

                    // Increment the count for this year
                    disastersByYear[year] += 1;
                }
            }
        });
    } else {
        console.log(`No disasters found for FIPS state code: ${fipsStateCode}`);
    }

    return disastersByYear;
}

// Pie Chart Data
// Disaster By Types for State
export function disastersByFipsTypes(fipsStateCode) {
    const disasters = disastersByFips[fipsStateCode];
    const incidentTypeCounts = {};
    const countedDisasterNumbers = new Set();

    if (disasters) {
        Object.values(disasters).forEach(disaster => {
            const disasterNumber = disaster.disasterNumber;
            const incidentType = disaster.incidentType;

            if (!countedDisasterNumbers.has(disasterNumber)) {
                countedDisasterNumbers.add(disasterNumber);

                if (incidentTypeCounts[incidentType]) {
                    incidentTypeCounts[incidentType]++;
                } else {
                    incidentTypeCounts[incidentType] = 1;
                }
            }
        });
    }
    return incidentTypeCounts;
}

// DisasterByType for County
export function disasterTypesByFipsCounty(fipsStateCode, fipsCountyCode) {
    const disasters = disastersByFips[fipsStateCode];
    const incidentTypeCounts = {};
    const countedDisasterNumbers = new Set();

    if (disasters) {
        Object.values(disasters).forEach(disaster => {
            const disasterNumber = disaster.disasterNumber;
            const incidentType = disaster.incidentType;
            const countyFips = disaster.fips_county_code; // Ensure correct property reference

            if (countyFips === fipsCountyCode && !countedDisasterNumbers.has(disasterNumber)) {
                countedDisasterNumbers.add(disasterNumber);
                
                if (incidentTypeCounts[incidentType]) {
                    incidentTypeCounts[incidentType]++;
                } else {
                    incidentTypeCounts[incidentType] = 1;
                }
            }
        });
    }
    return incidentTypeCounts;
}

function populateDataRows(fipsStateCode, fipsCountyCode) {
    const disastersInCounty = [];
    const stateDisasters = disastersByFips[fipsStateCode] == undefined ? 'Unknown' : Object.values(disastersByFips[fipsStateCode]);
    const displayedDisasterNumbers = new Set(); // To keep track of displayed disaster numbers
    let html = `
    <table class="table table-striped">
    <thead>
        <tr>
            <th scope="col" colspan="4" class="text-center">County Data</th>
        </tr>
        <tr>
            <th scope="col">Disaster Type</th>
            <th scope="col">Area Affected</th>
            <th scope="col">Declaration Title</th>
            <th scope="col">Date</th>
        </tr>
    </thead>
    <tbody>
    `;

    // Sort state disasters by date
    stateDisasters.sort((a, b) => new Date(b.declarationDate) - new Date(a.declarationDate));

    // Display county-specific disasters
    stateDisasters.forEach(disaster => {
        if (disaster.fips_county_code == fipsCountyCode) {
            disastersInCounty.push(disaster);
        }
    });

    // Display disasters for the selected county
    if (disastersInCounty.length > 0) {
        disastersInCounty.forEach(disaster => {
            html += `
        <tr>
            <td>${disaster.incidentType}</td>
            <td>${disaster.designatedArea}</td>
            <td>${disaster.declarationTitle}</td>
            <td>${disaster.declarationDate}</td>
        </tr>
        `;
            displayedDisasterNumbers.add(disaster.disasterNumber); // Track the disaster number
        });
    } else {
        html += `
        <tr><td colspan="4" class="text-center">No data on disasters in this county</td></tr>
        `;
    }

    // Add the separator row for state data
    html += `
        <thead>
        <tr>
            <th scope="col" colspan="4" class="text-center">State Data</th>
        </tr>
        <tr>
            <th scope="col">Disaster Type</th>
            <th scope="col">Area Affected</th>
            <th scope="col">Declaration Title</th>
            <th scope="col">Date</th>
        </tr>
        </thead>
    `;

    // Display state-level disasters in date order, ensuring no repeated disaster numbers
    stateDisasters.forEach(disaster => {
        if (!displayedDisasterNumbers.has(disaster.disasterNumber)) {
            html += `
        <tr>
            <td>${disaster.incidentType}</td>
            <td>${disaster.designatedArea}</td>
            <td>${disaster.declarationTitle}</td>
            <td>${disaster.declarationDate}</td>
        </tr>
        `;
            displayedDisasterNumbers.add(disaster.disasterNumber); // Track the disaster number
        }
    });

    html += `
    </tbody>
    </table>
    `;

    // Update the DOM with the new table content
    document.getElementById('rowData').innerHTML = html;
}

// Bar chart Data
export function getAverageDisastersPerMonth(fipsStateCode) {
    const disasters = disastersByFips[fipsStateCode];
    if (!disasters) return {};

    const monthTotals = {};
    const yearCounts = {};
    const disasterNumbersByMonth = {}; // To track disaster numbers per month

    Object.values(disasters).forEach(({ disasterNumber, declarationDate }) => {
        if (declarationDate && disasterNumber) {
            const date = new Date(declarationDate);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            // Initialize the month totals, year counts, and disaster number set if not already done
            if (!monthTotals[month]) {
                monthTotals[month] = 0;
                yearCounts[month] = new Set();
                disasterNumbersByMonth[month] = new Set(); // Add a Set to track disasterNumbers for this month
            }

            // Only count the disaster if its number has not been encountered for this month
            if (!disasterNumbersByMonth[month].has(disasterNumber)) {
                monthTotals[month]++; // Increment the disaster count for the month
                disasterNumbersByMonth[month].add(disasterNumber); // Mark this disasterNumber as counted
            }

            // Track the year for the month (to avoid counting the same year multiple times)
            yearCounts[month].add(year);
        }
    });

    // Calculate the average disasters per month
    const monthlyAverages = {};
    Object.keys(monthTotals).forEach(month => {
        const totalDisasters = monthTotals[month];
        const yearCount = yearCounts[month].size; // Get the number of unique years for that month
        monthlyAverages[month] = parseFloat((totalDisasters / yearCount).toFixed(2)); // Calculate the average
    });

    return monthlyAverages;
}

export function getAverageCountyDisastersPerMonth(fipsStateCode, fipsCountyCode) {
    const stateDisasters = disastersByFips[fipsStateCode];
    if (!stateDisasters) return {};

    const countyDisasters = Object.values(stateDisasters).filter(disaster => disaster.fips_county_code === fipsCountyCode);
    if (!countyDisasters.length) return {};

    const monthTotals = {};
    const yearCounts = {};
    const disasterNumbersByMonth = {}; // To track disaster numbers per month

    countyDisasters.forEach(({ disasterNumber, declarationDate }) => {
        if (declarationDate && disasterNumber) {
            const date = new Date(declarationDate);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            // Initialize the month totals, year counts, and disaster number set if not already done
            if (!monthTotals[month]) {
                monthTotals[month] = 0;
                yearCounts[month] = new Set();
                disasterNumbersByMonth[month] = new Set(); // Add a Set to track disasterNumbers for this month
            }

            // Only count the disaster if its number has not been encountered for this month
            if (!disasterNumbersByMonth[month].has(disasterNumber)) {
                monthTotals[month]++; // Increment the disaster count for the month
                disasterNumbersByMonth[month].add(disasterNumber); // Mark this disasterNumber as counted
            }

            // Track the year for the month (to avoid counting the same year multiple times)
            yearCounts[month].add(year);
        }
    });

    // Calculate the average disasters per month
    const monthlyAverages = {};
    Object.keys(monthTotals).forEach(month => {
        const totalDisasters = monthTotals[month];
        const yearCount = yearCounts[month].size; // Get the number of unique years for that month
        monthlyAverages[month] = parseFloat((totalDisasters / yearCount).toFixed(2)); // Calculate the average
    });

    return monthlyAverages;
}

export function getAverageDisastersPerYearByCounty(fipsStateCode) {
    const disasters = disastersByFips[fipsStateCode]; // Get disasters for the state

    if (!disasters) {
        console.log(`No disaster data found for state FIPS code: ${fipsStateCode}`);
        return {}; 
    }

    const countyDisasterCounts = {}; 
    const countedDisasterIds = new Set(); // To track unique disaster IDs

    // Loop through each disaster in the state
    Object.values(disasters).forEach(disaster => {
        const disasterId = disaster.id; 
        const declarationDate = disaster.declarationDate;
        const countyFips = disaster.fips_county_code;  // County FIPS code from the disaster data

        if (!disasterId || !declarationDate || !countyFips) {
            console.log("Skipping disaster due to missing data:", disaster);
            return; // Skip if any required data is missing
        }

        // Combine state FIPS code and county FIPS code to form a 5-digit FIPS code
        const fullFipsCode = fipsStateCode + countyFips;

        // Skip disaster if it's already counted by its disasterId
        if (!countedDisasterIds.has(disasterId)) {
            const year = new Date(declarationDate).getFullYear();

            // Initialize county data if it doesn't exist yet
            if (!countyDisasterCounts[fullFipsCode]) {
                countyDisasterCounts[fullFipsCode] = {
                    yearTotals: {}, // Store disaster counts per year for this county
                    disasterIds: new Set() // Track unique disaster IDs for this county
                };
            }

            const countyData = countyDisasterCounts[fullFipsCode];

            // Count disasters for this county by year
            countyData.yearTotals[year] = (countyData.yearTotals[year] || 0) + 1;
            countyData.disasterIds.add(disasterId);

            // Add disasterId to the global set to ensure no duplicates are counted
            countedDisasterIds.add(disasterId);
        }
    });

    // Calculate the average disasters per year for each county
    const countyAverages = {};

    Object.keys(countyDisasterCounts).forEach(countyFips => {
        const { yearTotals } = countyDisasterCounts[countyFips];

        const totalYears = Object.keys(yearTotals).length;
        const totalDisasters = Object.values(yearTotals).reduce((sum, count) => sum + count, 0);

        // Calculate the average number of disasters per year
        const averageDisastersPerYear = totalYears > 0 ? parseFloat((totalDisasters / totalYears).toFixed(2)) : 0;

        countyAverages[countyFips] = averageDisastersPerYear;
    });

    return countyAverages;
}