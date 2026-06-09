import { getPositionsForProfile, getD9RasiIndex } from './ephemerisEngine';

/**
 * Calculates a rectified birth chart by adding a time delta in minutes to the original birth time.
 *
 * @param {Object} originalBirthData - Profile/birth data containing dob, time, tzone, lat, lon.
 * @param {number} timeDeltaMinutes - Time difference in minutes (+/-).
 * @returns {Object|null} New high-precision chart object containing planetary positions and Lagna.
 */
export function getRectifiedChartData(originalBirthData, timeDeltaMinutes) {
    if (!originalBirthData || !originalBirthData.dob) return null;

    const timeStr = originalBirthData.time || originalBirthData.tob || '12:00';
    const tz = Number(originalBirthData.tzone ?? originalBirthData.tz ?? 5.5);
    const lat = Number(originalBirthData.lat ?? 17.3850);
    const lon = Number(originalBirthData.lon ?? 78.4867);

    const [y, m, d] = String(originalBirthData.dob).split('-').map(Number);
    const [hr, min] = String(timeStr).split(':').map(Number);

    if (![y, m, d, hr, min, tz, lat, lon].every(Number.isFinite)) return null;

    // Convert birth time to UTC milliseconds
    const originalUTC = Date.UTC(y, m - 1, d, hr, min) - (tz * 3600000);

    // Apply rectification offset
    const rectifiedUTC = originalUTC + timeDeltaMinutes * 60000;

    // Reconstruct local date/time parts in the birth timezone
    const localAdjusted = new Date(rectifiedUTC + (tz * 3600000));
    
    const rectifiedYear = localAdjusted.getUTCFullYear();
    const rectifiedMonth = String(localAdjusted.getUTCMonth() + 1).padStart(2, '0');
    const rectifiedDay = String(localAdjusted.getUTCDate()).padStart(2, '0');
    
    const rectifiedDob = `${rectifiedYear}-${rectifiedMonth}-${rectifiedDay}`;
    const rectifiedTime = `${String(localAdjusted.getUTCHours()).padStart(2, '0')}:${String(localAdjusted.getUTCMinutes()).padStart(2, '0')}`;

    const rectifiedProfile = {
        ...originalBirthData,
        dob: rectifiedDob,
        time: rectifiedTime,
        lat,
        lon,
        tzone: tz
    };

    const chart = getPositionsForProfile(rectifiedProfile);
    if (chart) {
        chart.profile = rectifiedProfile;
        chart.timeDelta = timeDeltaMinutes;
    }
    return chart;
}

/**
 * Compares old and new chart properties to detect changes in Lagna (D1) and Navamsa (D9).
 *
 * @param {Object} oldChart - Original chart details.
 * @param {Object} newChart - Rectified chart details.
 * @returns {Object} Boolean flags indicating varga changes, plus old and new indices.
 */
export function detectVargaChanges(oldChart, newChart) {
    if (!oldChart || !newChart) {
        return {
            lagnaChanged: false,
            navamsaChanged: false,
            oldLagna: 0,
            newLagna: 0,
            oldNavamsa: 0,
            newNavamsa: 0
        };
    }

    const oldLagna = oldChart.lagnaIndex;
    const newLagna = newChart.lagnaIndex;

    const oldNavamsa = getD9RasiIndex(oldChart.lagnaDegree);
    const newNavamsa = getD9RasiIndex(newChart.lagnaDegree);

    return {
        lagnaChanged: oldLagna !== newLagna,
        navamsaChanged: oldNavamsa !== newNavamsa,
        oldLagna,
        newLagna,
        oldNavamsa,
        newNavamsa
    };
}
