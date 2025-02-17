export let disastersByFips = {};
const hcaStateFips = ["01", "02", "06", "08", "12", "13", "16", "18", "20", "21", "22", "29", "28", "37", "32", "33", "45", "47", "48", "49", "51"];

function cleanFEMADisasterData(disaster) {
    let newObject = {
        id: disaster.id || 'N/A',
        state: disaster.state,
        fips_state_code: disaster.fipsStateCode || 'Unknown',
        fips_county_code: disaster.fipsCountyCode
            ? disaster.fipsCountyCode.toString().padStart(3, '0') 
            : 'Unknown',
        incidentType: disaster.incidentType ? disaster.incidentType.trim() : 'Unknown',
        year: disaster.declarationDate ? new Date(disaster.declarationDate).getFullYear() : 'Unknown',
        designatedArea: disaster.designatedArea ? disaster.designatedArea.trim() : 'Unknown',
        disasterNumber: disaster.disasterNumber || 'N/A',
        declarationDate: disaster.declarationDate ? formatDate(disaster.declarationDate) : 'Unknown'
    };
    return newObject;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Ensure two digits for month
    const day = date.getDate().toString().padStart(2, '0'); // Ensure two digits for day
    return `${year}-${month}-${day}`;
}

export async function fetchFEMADisasterDeclarationsSummariesSince1968() {
    let skip = 0;
    const batchSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
        const url = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=declarationDate ge '1968-01-01'&$top=${batchSize}&$skip=${skip}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.DisasterDeclarationsSummaries && data.DisasterDeclarationsSummaries.length > 0) {
            data.DisasterDeclarationsSummaries.forEach(disaster => {
                const fipsCode = disaster.fipsStateCode;

                if (hcaStateFips.includes(fipsCode)) {
                    const newObject = cleanFEMADisasterData(disaster);

                    if (!disastersByFips[fipsCode]) {
                        disastersByFips[fipsCode] = {};
                    }

                    if (!disastersByFips[fipsCode][newObject.id]) {
                        disastersByFips[fipsCode][newObject.id] = newObject;
                    }
                }
            });

            skip += batchSize;
        } else {
            hasMoreData = false;
        }
    }
    await removeInvalidFipsData()
}

async function removeInvalidFipsData() {
    // Load GeoJSON counties data (you can load this from a URL or from a local file)
    const geojsonUrl = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";
    const geoData = await d3.json(geojsonUrl);

    // Extract valid county FIPS codes from the GeoJSON
    const validFipsCodes = new Set();
    geoData.features.forEach(feature => {
        // Combine state and county FIPS codes to create the full FIPS code
        const countyFips = feature.properties.STATE + feature.properties.COUNTY;
        validFipsCodes.add(countyFips);
    });

    // Iterate over disastersByFips and delete invalid FIPS code entries
    Object.keys(disastersByFips).forEach(stateFipsCode => {
        const stateDisasters = disastersByFips[stateFipsCode];

        // Iterate over each disaster and remove invalid entries
        Object.keys(stateDisasters).forEach(disasterId => {
            const disaster = stateDisasters[disasterId];
            const countyFips = disaster.fips_county_code;  // County FIPS code from disaster data

            // Combine state FIPS code and county FIPS code to create the full FIPS code
            const fullFipsCode = stateFipsCode + countyFips;

            // If the full FIPS code is invalid, delete the disaster entry
            if (!validFipsCodes.has(fullFipsCode)) {
                delete stateDisasters[disasterId];  // Remove invalid disaster
            }
        });

        // If a state has no valid disasters, delete the state entry
        if (Object.keys(stateDisasters).length === 0) {
            delete disastersByFips[stateFipsCode];  // Remove state if no valid disasters exist
        }
    });
}
