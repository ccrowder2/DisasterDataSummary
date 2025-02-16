export let disastersByFips = {};
const hcaStateFips = ["01", "02", "06", "08", "12", "13", "16", "18", "20", "21", "22", "29", "28", "37", "32", "33", "45", "47", "48", "49", "51"];

function cleanFEMADisasterData(disaster) {
    let newObject = {
        id: disaster.disasterNumber || 'N/A',
        state: disaster.state,
        fips_state_code: disaster.fipsStateCode || 'Unknown',
        fips_county_code: disaster.fipsCountyCode
            ? disaster.fipsCountyCode.toString().padStart(3, '0') 
            : 'Unknown',
        incidentType: disaster.incidentType ? disaster.incidentType.trim() : 'Unknown',
        year: disaster.declarationDate ? new Date(disaster.declarationDate).getFullYear() : 'Unknown',
        designatedArea: disaster.designatedArea ? disaster.designatedArea.trim() : 'Unknown'
    };
    return newObject;
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
}