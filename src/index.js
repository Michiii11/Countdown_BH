function pad(n) {
    return n < 10 ? '0' + n : n.toString();
}

function countdownString(target, now) {
    let diff = target.getTime() - now.getTime();
    if (diff < 0) diff = 0;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function setDone(element) {
    element.innerHTML = `<span>Erledigt</span>`;
    element.className = 'countdown-done';
}

function updateCountdowns() {
    const now = new Date();

    // Mittagspause (10:30)
    const lunchTarget = new Date(now);
    lunchTarget.setHours(10, 30, 0, 0);
    const lunchDone = now > lunchTarget;
    const lunchElem = document.getElementById('lunch');
    if (lunchDone) {
        setDone(lunchElem);
    } else {
        lunchElem.className = 'countdown-value';
        lunchElem.innerHTML = countdownString(lunchTarget, now);
    }

    // Dienstschluss (15:30)
    const dailyTarget = new Date(now);
    dailyTarget.setHours(15, 30, 0, 0);
    const dailyDone = now > dailyTarget;
    const dailyElem = document.getElementById('daily');
    if (dailyDone) {
        setDone(dailyElem);
    } else {
        dailyElem.className = 'countdown-value';
        dailyElem.innerHTML = countdownString(dailyTarget, now);
    }

    // Wochenende
    const weeklyDiv = document.querySelector('.weekly');
    let weeklyDone = false;
    let weeklyTarget;
    let daysLeft = 0;
    let hoursLeft = 0;
    if (now.getDay() === 5 && now > new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30)) {
        weeklyDone = true;
    } else if (now.getDay() === 6 || now.getDay() === 0) {
        weeklyDone = true;
    } else {
        weeklyTarget = new Date(now);
        weeklyTarget.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
        weeklyTarget.setHours(15, 30, 0, 0);
        const diffMs = weeklyTarget - now;
        daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        hoursLeft = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    }
    if (weeklyDone) {
        setDone(weeklyDiv);
    } else {
        weeklyDiv.className = 'countdown-value weekly';
        weeklyDiv.innerHTML = `${daysLeft} Tag(e) und ${hoursLeft} Stunde(n)`;
    }

    // Abrüsten (1. März)
    const overallTarget = new Date(2026, 2, 1, 0, 0, 0, 0);
    const overallDone = now > overallTarget;
    const overallElem = document.getElementById('overall');
    if (overallDone) {
        setDone(overallElem);
    } else {
        const diffMs = overallTarget - now;
        const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const weeksLeft = Math.floor(totalDays / 7);

        let workdays = 0;
        let tempDate = new Date(now);
        for (let i = 0; i < totalDays; i++) {
            tempDate.setDate(tempDate.getDate() + 1);
            const day = tempDate.getDay();
            if (day >= 1 && day <= 5) workdays++;
        }

        overallElem.className = 'countdown-value';
        overallElem.innerHTML = `${weeksLeft} Woche(n), ${workdays} Tag(e)`;
    }
}

setInterval(updateCountdowns, 1000);
updateCountdowns();