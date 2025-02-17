import { fetchFEMADisasterDeclarationsSummariesSince1968 } from './apis.js';
import { createDisastersLineChart } from './graphs.js';
import { disastersByFips } from './apis.js';
import { createPieChartForTypes } from './graphs.js';
import { createBarChartForMonthlyAverageByState } from './graphs.js';
import { loadStateMap } from './graphs.js';

window.handleOnLoad = async function handleOnLoad() {
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
    displayAllData('12001')
}

async function fetchAllAPIData() {
    await fetchFEMADisasterDeclarationsSummariesSince1968()
}

function displayAllData(fipsCode){
    let fipsStateCode = fipsCode[0] + fipsCode[1]
    let fipsCountyCode = fipsCode[2] + fipsCode[3] + fipsCode[4]
    let view = false

    // State view = false; County View = true;
    if(view == false){
        createDisastersLineChart(fipsStateCode)
        createPieChartForTypes(fipsStateCode)
        createBarChartForMonthlyAverageByState(fipsStateCode)
        loadStateMap(fipsStateCode)
        console.log(getAverageDisastersPerYearByCounty(fipsStateCode))
        populateDataRows(fipsStateCode,fipsCountyCode)
    } else {
        // If view is in county
    }
}

const fipsToAbbreviation = {
    "01": "AL", "06": "CA", "08": "CO", "12": "FL", "13": "GA", 
    "16": "ID", "18": "IN", "20": "KS", "21": "KY", "22": "LA", 
    "29": "MO", "28": "MS", "37": "NC", "32": "NV", "33": "NH", 
    "45": "SC", "47": "TN", "48": "TX", "49": "UT", "51": "VA"
};


export function getStateAbbreviationByFips(fipsCode) {
    const abbreviation = fipsToAbbreviation[fipsCode];
    if (abbreviation) {
        return abbreviation;
    }
}

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

function populateDataRows(fipsStateCode, fipsCountyCode) {
    const disastersInCounty = []
    const disasters = disastersByFips[fipsStateCode] == undefined ? 'Unknown' : Object.values(disastersByFips[fipsStateCode]);
    let html = `
    <table class="table table-striped">
    <thead>
        <tr>
            <th scope="col">Disaster Type</th>
            <th scope="col">Area Affected</th>
            <th scope="col">Year</th>
        </tr>
    </thead>
    <tbody>
    `

    disasters.sort((a, b) => b.year - a.year);
    
    disasters.forEach(disaster => {
        if (disaster.fips_county_code == fipsCountyCode) {
            disastersInCounty.push(disaster)
        }
    })

    if (disastersInCounty.length > 0){
        disastersInCounty.forEach(disaster => {
            html += `
        <tr>
            <td>${disaster.incidentType}</td>
            <td>${disaster.designatedArea}</td>
            <td>${disaster.year}</td>
        </tr>
        `
        })

        html += `
        </tbody>
        `
    } else {
        html = `No data on disasters`
    }
document.getElementById('rowData').innerHTML = html
}

export function getAverageDisastersPerMonth(fipsStateCode) {
    const disasters = disastersByFips[fipsStateCode];
    if (!disasters) return {};

    const monthTotals = {};
    const yearCounts = {};

    Object.values(disasters).forEach(({ declarationDate }) => {
        if (declarationDate) {
            const date = new Date(declarationDate);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            if (!monthTotals[month]) {
                monthTotals[month] = 0;
                yearCounts[month] = new Set();
            }

            monthTotals[month]++;
            yearCounts[month].add(year);
        }
    });

    const monthlyAverages = {};
    Object.keys(monthTotals).forEach(month => {
        const totalDisasters = monthTotals[month];
        const yearCount = yearCounts[month].size;
        monthlyAverages[month] = parseFloat((totalDisasters / yearCount).toFixed(2));
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