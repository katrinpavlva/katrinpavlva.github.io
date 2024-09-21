document.addEventListener("DOMContentLoaded", setup);

let user = [];

// Set up the page after login
function setup() {
    const logoutBtn = document.getElementById("logout");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutButton);
    } else {
        console.error("Logout button not found.");
    }

    const JWT = localStorage.getItem("jwtToken");
    if (!JWT) {
        window.location.href = "index.html"; // Redirect if no token
    } else {
        displayData(JWT);
    }
}

// Fetch and display user data
function displayData(JWT) {
    const query = `
    {
        user {
            login
            attrs
            totalUp
            totalDown
            transactions(order_by: { createdAt: desc }) {
                type
                amount
                createdAt
                path
            }
            progresses {
                object {
                    parents {
                        attrs
                    }
                }
            }
        }
    }`;

    fetch("https://01.kood.tech/api/graphql-engine/v1/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${JWT}`,
        },
        body: JSON.stringify({ query: query }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.data && data.data.user.length > 0) {
            userChart(data);
        } else {
            console.error("No user data found.");
        }
    })
    .catch(error => {
        console.error("Error fetching user data:", error);
    });
}

// Render user information and charts
function userChart(data) {
    user = data.data.user[0];
    const level = user.transactions.filter(
        element => element.type === "level" && !element.path.includes("piscine") && !element.path.includes("rust")
    ).reduce((prevElement, currentElement) => {
        return currentElement.amount > prevElement.amount ? currentElement : prevElement;
    });
    const path = level.path.split("/").reverse()[0];

    // Display user data
    document.getElementById("name").innerHTML = `Welcome, ${user.attrs.firstName} ${user.attrs.lastName}!`;
    document.getElementById("email").innerHTML = `E-mail: ${user.attrs.email}`;
    document.getElementById("level").innerHTML = `Level: ${level.amount}`;
    document.getElementById("lastTask").innerHTML = `Last completed task: ${path}`;

    // Render charts
    updateCharts(user);
}

// Update charts after receiving user data
function updateCharts(user) {
    createSkillsChart(user);
    designAudits(user);
    designTasks(user);
}

// Logout function
function logoutButton() {
    localStorage.removeItem("jwtToken");
    window.location.href = "index.html"; // Redirect to login page
}

// Render Skills Chart
function createSkillsChart(user) {
    const skills = document.getElementById("skillChart");
    const userSkills = document.createElement("h4");
    userSkills.innerHTML = "User Skills:";
    let skillMap = new Map();

    const progresses = user.progresses;
    for (const progress of progresses) {
        for (const parent of progress.object.parents) {
            const attrs = parent.attrs;
            if (attrs && attrs.baseSkills) {
                const baseSkills = attrs.baseSkills;
                for (const skill in baseSkills) {
                    if (baseSkills.hasOwnProperty(skill)) {
                        const skillValue = baseSkills[skill];
                        if (!skillMap.has(skill) || skillValue > skillMap.get(skill)) {
                            skillMap.set(skill, skillValue);
                        }
                    }
                }
            }
        }
    }

    const skillGraph = document.createElement("div");
    skillGraph.append(SkillsGraph(skillMap));
    skills.append(userSkills, skillGraph);
}

// Render Audit Graph
function designAudits(user) {
    const audits = document.getElementById("auditChart");
    const auditRatio = document.createElement("h4");
    auditRatio.innerHTML = "Audits ratio";

    const userAuditRatio = document.createElement("p");
    const auditR = Math.round((user.totalUp / user.totalDown) * 10) / 10;
    userAuditRatio.innerHTML = auditR > 0.4 ? `${auditR} Almost perfect!` : `${auditR} Be careful, buddy.`;
    userAuditRatio.style.color = auditR > 0.4 ? "hsl(181, 50%, 53%)" : "hsl(0, 50%, 53%)";

    const auditGraph = document.createElement("div");
    auditGraph.append(AuditGraph([bytesConversion(user.totalUp, "MB").amount, bytesConversion(user.totalDown, "MB").amount]));
    audits.append(auditRatio, auditGraph, userAuditRatio);
}

// Render XP Tasks Chart
function designTasks(user) {
    const xps = user.transactions.filter(element => element.type === "xp" && !element.path.includes("piscine") && !element.path.includes("rust"));
    const sum = bytesConversion(xps.reduce((total, element) => total + element.amount, 0));
    const xpCount = document.getElementById("tasksChart");

    const userXP = document.createElement("p");
    userXP.innerHTML = `XP progression`;

    const graphCont = document.createElement("div");
    graphCont.className = "graph-container";
    graphCont.append(XPGraph(xps));

    xpCount.append(userXP, graphCont);
}

function AuditGraph(audits) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'audit-chart');
    var yData = ['done', 'received'];
    yData.forEach((el, i) => {
        var arrow;
        if (el == 'done') { arrow = '\u2191'; } else { arrow = '\u2193'; }
        yData[i] = `${arrow} ${audits[i]} MB ${el}`;
    });

    var bars = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: yData,
            datasets: [{
                data: audits,
                backgroundColor: [
                    'hsl(181, 50%, 53%)',
                    'hsl(59, 100%, 50%)',
                ]
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            aspectRatio: 4,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${audits[context.dataIndex]} MB`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false,
                    ticks: {
                        color: '#ffffff' 
                    }
                },
                y: {
                    ticks: {
                        color: '#ffffff' 
                    }
                }
            }
        }
    });
    return canvas;
}

function SkillsGraph(skillMap) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'skill-chart');
    var yData = [];
    var xData = [];
    for (const [skill, value] of skillMap.entries()) {
        yData.push(skill);
        xData.push(value);
    }

    var radarChart = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: yData,
            datasets: [{
                data: xData,
                backgroundColor: ['hsl(181, 50%, 53%)']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${xData[context.dataIndex]} %`;
                        }
                    }
                },
                filler: {
                    propagate: false
                }
            },
            scales: {
                r: {
                    ticks: {
                        color: '#ffffff', 
                    },
                    pointLabels: {
                        color: '#ffffff' 
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.2
                }
            },
            interaction: {
                intersect: false
            }
        }
    });
    return canvas;
}


function XPGraph(xps) {
    let canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'chart');
    var xpData = xps.map(function (entity) {
        return {
            date: new Date(entity.createdAt),
            xp: entity.amount,
            task: entity.path.split('/')[entity.path.split('/').length - 1]
        };
    });
    xpData.sort(function (a, b) { return a.date - b.date; });
    for (let i = 1; i < xpData.length; i++) { xpData[i].xp += xpData[i - 1].xp; }
    var labels = xpData.map(function (data) { return data.date.toLocaleDateString(); });
    var data = xpData.map(function (data) { return bytesConversion(data.xp, "KB").amount; });
    var lineChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Your XP',
                data: data,
                fill: false,
                borderColor: 'hsl(181, 50%, 53%)',
                pointBackgroundColor: 'rgba(255, 255, 255, 0.9)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Amount: ${data[context.dataIndex]} kB\nTask: ${xpData[context.dataIndex].task}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#ffffff' 
                    }
                },
                y: {
                    ticks: {
                        color: '#ffffff' 
                    }
                }
            }
        }
    });
    return canvas;
}

function designAudits(user) {
    let audits = document.getElementById("auditChart");
    let auditRatio = document.createElement('h4')
    auditRatio.innerHTML = `Audits ratio`
    let userAuditRatio = document.createElement('p')
    let auditR = Math.round((user.totalUp / user.totalDown) * 10) / 10
    auditR > 0.4 ? userAuditRatio.innerHTML = `${auditR} Almost perfect!` : userAuditRatio.innerHTML = `${auditR} Be careful, buddy.`
    auditR > 0.4 ? userAuditRatio.style.color = 'hsl(181, 50%, 53%)' : userAuditRatio.style.color = 'hsl(181, 50%, 53%)'
    let auditGraph = document.createElement('div')
    auditGraph.append(AuditGraph([bytesConversion(user.totalUp, "MB").amount, bytesConversion(user.totalDown, "MB").amount]))
    audits.append(auditRatio, auditGraph, userAuditRatio)
}

function designTasks(user) {
    const xps = user.transactions.filter(element => element.type === "xp" && !element.path.includes("piscine") && !element.path.includes("rust"));
    const sum = bytesConversion(xps.reduce((total, element) => total + element.amount, 0));
    let xpCount = document.getElementById("tasksChart")
    let userXP = document.createElement('p')
    userXP.innerHTML = `XP progression`
    let graphCont = document.createElement('div')
    graphCont.className = 'graph-container'
    graphCont.append(XPGraph(xps))
    xpCount.append(userXP, graphCont)
}

function bytesConversion(bytes, size) {
    const sizes = ["Bytes", "KB", "MB"];
    if (bytes === 0) {return "0 Byte";}
    var i = -1
    size != null ? i = sizes.indexOf(size) : i = Math.floor(Math.log(bytes) / Math.log(1000))
    const convertedValue = parseFloat((bytes / Math.pow(1000, i)).toFixed(2));
    return {
        amount: convertedValue,
        size: sizes[i]
    }
}
