import { showLoader, hideLoader, showPopup } from './ui-utils.js';

// Function to get the authentication token
const getAuthToken = () => {
    try {
        const tokenKey = 'adobeid_ims_access_token/demo-copilot/false/AdobeID,openid';
        const tokenData = localStorage.getItem(tokenKey);
        
        if (!tokenData) {
            console.error('No token found in localStorage');
            return null;
        }

        const parsedToken = JSON.parse(tokenData);
        return parsedToken.tokenValue;
    } catch (error) {
        console.error('Error parsing token from localStorage:', error);
        return null;
    }
};

// Function to get user LDAP from session storage
const getUserLdap = () => {
    try {
        const profileKey = 'adobeid_ims_profile/demo-copilot/false/AdobeID,openid';
        const profileData = sessionStorage.getItem(profileKey);
        
        if (!profileData) {
            console.error('No profile data found in sessionStorage');
            return 'pbakliwal';
        }

        const parsedProfile = JSON.parse(profileData);
        const email = parsedProfile.email;
        
        if (!email) {
            console.error('No email found in profile data');
            return 'pbakliwal';
        }

        // Extract LDAP from email (assuming format: ldap@adobe.com)
        const ldap = email.split('@')[0];
        return ldap;
    } catch (error) {
        console.error('Error parsing profile data from sessionStorage:', error);
        return null;
    }
};

// Function to extract project and demo IDs from URL parameter
const extractIds = (paramValue) => {
    if (!paramValue) return null;
    const parts = paramValue.split('/');
    if (parts.length >= 2) {
        return {
            projectId: parts[0],
            demoId: parts[1]
        };
    }
    return null;
};

// Function to fetch project data from API
const fetchProjectData = async (projectId) => {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const response = await fetch(`https://btci3qnv43.execute-api.us-east-1.amazonaws.com/projects/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching project data:', error);
        throw error;
    }
};

// Function to get resource type from component name
const getResourceType = (pathToModify) => {
    try {
        if (!pathToModify) {
            console.warn('No pathToModify provided');
            return null;
        }

        // Split the pathToModify by '_' and validate parts
        const parts = pathToModify.split('_');
        if (parts.length < 2) {
            console.warn('Invalid pathToModify format');
            return null;
        }

        const componentName = parts[0];
        const childComponentName = parts.length > 2 ? parts[2] : null;
        
        // Component filters data - standardize as arrays
        const filterData = {
            "column": ["text", "image", "button", "title"],
            "activity-details": ["activity-detail"],
            "accordion": ["accordion-item"],
            "carousel": ["slide"]
        };

        // Component definition data with their resource types
        const componentData = {
            "text": "core/franklin/components/text/v1/text",
            "title": "core/franklin/components/title/v1/title",
            "image": "core/franklin/components/image/v1/image",
            "button": "core/franklin/components/button/v1/button",
            "section": "core/franklin/components/section/v1/section",
            "columns": "core/franklin/components/columns/v1/columns",
            "hero": "core/franklin/components/block/v1/block",
            "carousel": "core/franklin/components/block/v1/block",
            "slide": "core/franklin/components/block/v1/block/item",
            "accordion": "core/franklin/components/block/v1/block",
            "accordion-item": "core/franklin/components/block/v1/block/item",
            "teaser": "core/franklin/components/block/v1/block",
            "featured-article": "core/franklin/components/block/v1/block",
            "content-fragment": "core/franklin/components/block/v1/block",
            "article-content-fragment": "core/franklin/components/block/v1/block",
            "demo-block": "core/franklin/components/block/v1/block",
            "workfront-reference": "core/franklin/components/block/v1/block",
            "embed": "core/franklin/components/block/v1/block",
            "blockquote": "core/franklin/components/block/v1/block",
            "article-details": "core/franklin/components/block/v1/block",
            "activity-detail": "core/franklin/components/block/v1/block/item"
        };

        // Get the base resource type for the component
        let resourceType = componentData[componentName];
        if (!resourceType) {
            console.warn(`No resource type found for component: ${componentName}`);
            return null;
        }

        // Initialize filter and finalComponentName
        let filter = null;
        let finalComponentName = componentName;

        // Special handling for columns
        if (componentName === 'columns' && childComponentName) {
            // For columns, check if child component is valid
            if (filterData.column.includes(childComponentName)) {
                filter = 'columns';
                finalComponentName = childComponentName;
                resourceType = componentData[childComponentName];
            }
        } else if (filterData[componentName] && componentName !== 'columns') {
            // For other filter containers, get the filter component name from array
            const filterComponentName = filterData[componentName][0]; // Get the first (and only) element
            filter = componentName;
            finalComponentName = filterComponentName;
            resourceType = componentData[filterComponentName];
        }

        return {
            resourceType,
            filter,
            model: finalComponentName,
            childComponent: childComponentName
        };

    } catch (error) {
        console.error('Error in getResourceType:', error);
        return null;
    }
};

// Function to find path to modify based on edit ID
const getPathToModify = (editId) => {
    try {
        // Find element with matching data-demo-copilot-edit-id
        const element = document.querySelector(`[data-demo-copilot-edit-id="${editId}"]`);
        if (!element) {
            console.warn(`No element found with data-demo-copilot-edit-id="${editId}"`);
            return null;
        }
        
        // Return the ID of the element
        return element.id || null;
    } catch (error) {
        console.error('Error finding path to modify:', error);
        return null;
    }
};

// Function to process edits and create payload updates
const processEdits = (demo) => {
    if (!demo || !demo.edits) return null;

    return demo.edits.map(edit => {
        const pathToModify = getPathToModify(edit.id);
        
        const resource = getResourceType(pathToModify);
        return {
            importedUrl: edit.sourceUrl || '',
            pathToModify: pathToModify || edit.targetInfo.xPath || '',
            name: edit.sourceImageId || '',
            originalEdit: edit,
            editId: edit.id,
            resource: resource
        };
    });
};

// Function to get payload updates
const getPayloadUpdates = async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const copilotParam = urlParams.get('copilotEditor') || urlParams.get('copilotPreview');
        const ids = extractIds(copilotParam);
        
        if (!ids) {
            console.error('Invalid project/demo IDs in URL');
            return null;
        }

        const projectData = await fetchProjectData(ids.projectId);
        
        // Find the specific demo in the project data
        const targetDemo = projectData.demos.find(demo => demo.id === ids.demoId);
        
        if (!targetDemo) {
            console.error('Demo not found in project data');
            return null;
        }

        const updates = processEdits(targetDemo);
        
        if (!updates) {
            console.error('No valid updates found in demo data');
            return null;
        }

        const userLdap = getUserLdap();
        if (!userLdap) {
            console.error('Could not retrieve user LDAP');
            return null;
        }

        return {
            projectName: targetDemo.name || "defaultName",
            type: "xwlak-copilot-assisted",
            userLdap: userLdap,
            aemURL: "https://author-p142310-e1462720.adobeaemcloud.com/",
            images: updates
        };
    } catch (error) {
        console.error('Error getting payload updates:', error);
        return null;
    }
};

export async function uploadAsset() {
    let updates;
    try {
        showLoader();
        
        // Check for token before proceeding
        const token = getAuthToken();
        if (!token) {
            hideLoader();
            showPopup('Authentication token not found. Please log in again.', 'notice');
            return { status: 'error', message: 'Authentication token not found' };
        }

        // Get updates from API
        updates = await getPayloadUpdates();
        
        // Return early if no updates are available
        if (!updates) {
            hideLoader();
            showPopup('No updates available for asset upload', 'notice');
            return { status: 'skipped', message: 'No updates available' };
        }

        console.log("payload for assets:", updates);

        // Send request in no-cors mode
        const response = await fetch('https://275323-918sangriatortoise-stage.adobeioruntime.net/api/v1/web/dx-excshell-1/assets', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        console.log('Request sent in no-cors mode');
        console.log('response from upload:', response);
        hideLoader();
        showPopup('Assets uploaded successfully', 'success');
        return { status: 'sent', message: 'Request sent in no-cors mode' };

    } catch (error) {
        console.error('Upload failed:', error);
        hideLoader();
        showPopup('Failed to upload assets. Please try again.', 'notice');
        throw error;
    }
}