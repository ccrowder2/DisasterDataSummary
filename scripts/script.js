import { fetchFEMADisasterDeclarationsSummariesSince1968 } from './apis.js';
import { createDisastersLineChart } from './graphs.js';
import { disastersByFips } from './apis.js';
import { createPieChartForTypes } from './graphs.js';

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

            <div class="row d-flex justify-content-between">
                <div class="col-md-6">
                    <div id="svg-container2">
                    </div>
                </div>
                <div class="col-md-6">
                    <div id="svg-container3">
                    </div>
                </div>
            </div>

            <div id="svg-container4">
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

export function disastersByFipsSince1968(fipsStateCode){
    const disastersByYear = {};
    const disasters = disastersByFips[fipsStateCode];

    if (disasters) {
        const disasterArray = Object.values(disasters);

        disasterArray.forEach(obj => {
            const year = obj.year;

            if (!disastersByYear[year]) {
                disastersByYear[year] = 0;
            }

            disastersByYear[year] += 1;
        });
    } else {
        console.log(`No disasters found for FIPS code: ${fipsStateCode}`);
    }
    return disastersByYear;
}

export function disastersByFipsTypes(fipsStateCode) {
    const disasters = disastersByFips[fipsStateCode];
    const incidentTypeCounts = {};

    Object.values(disasters).forEach(disaster => {
        const incidentType = disaster.incidentType;

        if (incidentTypeCounts[incidentType]) {
            incidentTypeCounts[incidentType]++;
        } else {
            incidentTypeCounts[incidentType] = 1;
        }
    });

    return incidentTypeCounts
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