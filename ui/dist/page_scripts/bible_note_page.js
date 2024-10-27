import * as utils from "../utils.js";
import * as pages from "./pages.js";
export function run() {
    utils.init_format_copy_event_listener();
    Promise.all([
        pages.init_header(),
        init_resizer(),
    ]).then(_ => {
        document.body.style.visibility = 'visible';
    });
}
var PaneSideType;
(function (PaneSideType) {
    PaneSideType[PaneSideType["Right"] = 0] = "Right";
    PaneSideType[PaneSideType["Left"] = 1] = "Left";
})(PaneSideType || (PaneSideType = {}));
function init_resizer() {
    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('right-pane');
    const resizer = document.getElementById('resizer');
    const collapseLeftBtn = document.getElementById('collapse-left');
    const collapseRightBtn = document.getElementById('collapse-right');
    const paneContainer = document.getElementById('pane-container');
    if (!leftPane || !rightPane || !resizer || !collapseLeftBtn || !collapseRightBtn || !paneContainer)
        return;
    let isResizing = false;
    const collapseThreshold = 10; // If the pane is smaller than 10%, it will collapse
    // Handle mousedown event on the resizer
    resizer.addEventListener('mousedown', function (e) {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // Prevent text selection during resize
        removeTransitions(); // Remove transitions while resizing
    });
    // Handle mousemove events on the window to capture even when pointer is outside resizer
    window.addEventListener('mousemove', function (e) {
        if (!isResizing)
            return;
        const containerWidth = paneContainer.offsetWidth;
        let leftWidth = e.clientX / containerWidth * 100;
        // Collapse left pane if it's too small
        if (leftWidth < collapseThreshold) {
            collapsePane(PaneSideType.Left);
        }
        // Collapse right pane if right side is too small
        else if ((100 - leftWidth) < collapseThreshold) {
            collapsePane(PaneSideType.Right);
        }
        else {
            // Normal resize behavior when within range
            leftPane.style.width = `${leftWidth}%`;
            rightPane.style.width = `${100 - leftWidth}%`;
            collapseLeftBtn.textContent = 'Collapse Left';
            collapseRightBtn.textContent = 'Collapse Right';
        }
    });
    // Handle mouseup to stop resizing
    window.addEventListener('mouseup', function () {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto'; // Restore text selection
            applyTransitions(); // Reapply transitions after resizing
        }
    });
    // Remove transitions when resizing
    function removeTransitions() {
        leftPane.style.transition = 'none';
        rightPane.style.transition = 'none';
    }
    // Reapply transitions after resizing
    function applyTransitions() {
        leftPane.style.transition = 'width 0.3s ease-in-out';
        rightPane.style.transition = 'width 0.3s ease-in-out';
    }
    // Function to collapse a pane
    function collapsePane(side) {
        if (side === PaneSideType.Left) {
            leftPane.style.width = '0%';
            leftPane.style.padding = '0'; // Remove padding for full collapse
            rightPane.style.width = '100%';
            collapseLeftBtn.textContent = 'Expand Left';
            collapseRightBtn.textContent = 'Collapse Right';
        }
        else if (side === PaneSideType.Right) {
            rightPane.style.width = '0%';
            rightPane.style.padding = '0'; // Remove padding for full collapse
            leftPane.style.width = '100%';
            collapseRightBtn.textContent = 'Expand Right';
            collapseLeftBtn.textContent = 'Collapse Left';
        }
        resizer.style.display = 'block';
        setTimeout(() => {
            if (leftPane.style.width === '0%' || rightPane.style.width === '0%') {
                resizer.style.display = 'none';
            }
        }, 300);
    }
    // Collapse/Expand logic for left pane
    collapseLeftBtn.addEventListener('click', function () {
        if (leftPane.style.width === '0%') {
            leftPane.style.width = '50%';
            leftPane.style.padding = '10px'; // Restore padding
            rightPane.style.width = '50%';
            collapseLeftBtn.textContent = 'Collapse Left';
            resizer.style.display = 'block';
        }
        else {
            collapsePane(PaneSideType.Left);
        }
    });
    // Collapse/Expand logic for right pane
    collapseRightBtn.addEventListener('click', function () {
        if (rightPane.style.width === '0%') {
            rightPane.style.width = '50%';
            rightPane.style.padding = '10px'; // Restore padding
            leftPane.style.width = '50%';
            collapseRightBtn.textContent = 'Collapse Right';
            resizer.style.display = 'block';
        }
        else {
            collapsePane(PaneSideType.Right);
        }
    });
}
