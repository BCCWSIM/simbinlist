var margin = {top: 20, right: 20, bottom: 30, left: 100},
    height = 500 - margin.top - margin.bottom;

// Function to update the chart size based on the window's width
function getWidth() {
    return window.innerWidth - margin.left - margin.right;  // Full width minus margins
}

var x = d3.scaleBand(), // x scale for Event ID (horizontal axis)
    y = d3.scaleBand().range([height, 0]).padding(0.1); // y scale for SKU (vertical axis)

var svg = d3.select("#chart")
    .attr("width", getWidth())  // Set initial width based on the window size
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var xAxis = d3.axisBottom(x).tickSize(0), // Format the x-axis to show only Event IDs
    yAxis = d3.axisLeft(y).tickSize(0); // Format the y-axis to show Item SKU names

var data;
var imageCache = {};  // Object to store the cached images
var isFirstImageLoaded = false; // Flag to check if the first image is loaded

// Define a color scale
var color = d3.scaleOrdinal(d3.schemeCategory10);

// Define the div for the tooltip
var div = d3.select("body").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);

// Load the CSV file from Google Sheets
d3.csv("https://docs.google.com/spreadsheets/d/e/2PACX-1vSTUrVA_ilFUgKBcUBRoEd2qshCNtOxW_WWhdggIsNGYWauvwhkkuK916imGfPVWJqmbuCnCPFR83DR/pub?output=csv").then(function(contents) {
    data = contents.map(function(d) {
        return {
            id: d['Event ID'],  // Event ID for x-axis
            name: d['Item SKU'], // SKU name for y-axis
            image: d['Image'], // Image link for the next item display
            start: new Date(d['Start Date']),
            end: new Date(d['End Date'])
        };
    });

    // Preload all images and cache them
    preloadImages(data);

    drawChart(data);
    updateNextItemInfo(data);  // Update the "next" item info when the chart is drawn

    // Add click event to the info bar to remove the next item
    d3.select("#info-bar").on("click", function() {
        var nextItem = data[0];  // Get the first remaining item
        if (nextItem) {
            data = data.filter(function(d) { return d.id !== nextItem.id; });
            drawChart(data);  // Redraw the chart
            updateNextItemInfo(data);  // Update the next item info
        }
    });
});

// Function to preload all images and store them in the cache
function preloadImages(data) {
    data.forEach(function(d) {
        var img = new Image();
        img.src = d.image; // Set the source URL of the image
        img.onload = function() {
            imageCache[d.id] = img;  // Cache the image when it's fully loaded
            if (!isFirstImageLoaded) {
                // Once the first image is loaded, mark the flag as true
                isFirstImageLoaded = true;
                updateNextItemInfo(data);  // Update display after the first image is loaded
            }
        };
        img.onerror = function() {
            imageCache[d.id] = null;  // If the image fails to load, store null
        };
    });
}

function drawChart(data) {
    svg.selectAll("*").remove();  // Clear any existing content in the chart

    // Determine the unique Event IDs for the x-axis and SKU names for the y-axis
    var eventIds = data.map(function(d) { return d.id; });
    var skuNames = data.map(function(d) { return d.name; });

    // Set the width of the SVG dynamically
    var width = getWidth();
    svg.attr("width", width);

    // Set domains for the scales based on the new width
    x.range([0, width]).domain(eventIds);  // Set the x-axis domain to the unique Event IDs
    y.domain(skuNames);  // Set the y-axis domain to the unique SKU names

    // Create the x-axis for Event ID (horizontal axis)
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickFormat(function(d) { return d; }))  // Only show Event ID as label
        .call(g => g.select(".domain").remove()); // Remove the x-axis line

    // Create the y-axis for SKU names (vertical axis)
    svg.append("g")
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove()); // Remove the y-axis line

    // Add alternating background colors to the rows
    svg.selectAll(".row-bg")
        .data(data)
        .enter().append("rect")
        .attr("class", "row-bg")
        .attr("x", function(d) { return x(d.id); }) // Position based on Event ID
        .attr("y", function(d) { return y(d.name); }) // Position based on SKU
        .attr("width", x.bandwidth()) // Bar width based on Event ID space
        .attr("height", y.bandwidth()) // Bar height based on SKU height
        .attr("fill", function(d, i) { return i % 2 ? "#eee" : "#fff"; }); // Alternating row colors

    svg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.id); }) // Position bars based on Event ID
        .attr("y", function(d) { return y(d.name); }) // Position bars based on SKU
        .attr("width", x.bandwidth()) // Set bar width based on the Event ID space
        .attr("height", y.bandwidth()) // Set bar height based on SKU height
        .style("fill", function(d, i) { return color(i); });
}

function updateNextItemInfo(data) {
    if (data.length > 0) {
        var nextItem = data[0];  // Get the first remaining item
        d3.select("#next-item-id").text(nextItem.id);
        d3.select("#next-item-name").text(nextItem.name);

        var imgElement = d3.select("#next-item-image");
        var imgUrl = nextItem.image;

        if (isFirstImageLoaded) {
            // Check if the image is already cached and display it immediately
            if (imageCache[nextItem.id]) {
                imgElement.attr("src", imageCache[nextItem.id].src);  // Use the cached image
                imgElement.style("display", "block");  // Display the image immediately
            } else {
                imgElement.style("display", "none");  // Hide the image if not cached or failed to load
            }
        } else {
            // If the first image is not loaded, just hide the image element
            imgElement.style("display", "none");
        }
    } else {
        d3.select("#next-item-id").text("ID: N/A");
        d3.select("#next-item-name").text("N/A");
        d3.select("#next-item-image").style("display", "none");  // Hide the image if no more items
    }
}
