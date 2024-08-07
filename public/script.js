document.addEventListener('DOMContentLoaded', () => {
    const userProfileButton = document.getElementById('userProfileButton');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.querySelector('.main-nav');
    const headerActions = document.querySelector('.header-actions');

    userProfileButton.addEventListener('click', () => {
        dropdownMenu.classList.toggle('active');
    });

    mobileMenuToggle.addEventListener('click', () => {
        mainNav.classList.toggle('active');
        headerActions.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!userProfileButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('active');
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const listButton = document.getElementById('listNavButton');
    const uploadNavButton = document.getElementById('uploadNavButton');
    const themeToggle = document.getElementById('theme-toggle');
    const downloadLinkInput = document.getElementById('downloadLinkInput');
    const customPopup = document.getElementById('customPopup');
    const popupClose = document.getElementById('popupClose');
    const popupTitle = document.getElementById('popupTitle');
    const popupMessage = document.getElementById('popupMessage');
    const linksList = document.getElementById('linksList');
    const clearAllButton = document.getElementById('clearAllButton');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const sortSelect = document.getElementById('sortSelect');
    const listViewButton = document.getElementById('listViewButton');
    const gridViewButton = document.getElementById('gridViewButton');
    
    
    let currentSortCriteria = 'date'; 
    let currentView = 'list'; 
    
    let allLinks = [];

    let currentFile = null;
    let isCurrentFileUploaded = false;
    let isUploading = false;

    let currentPage = 1;
    const itemsPerPage = 5;

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        updateThemeIcon();
    });

    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-theme');
    }
    updateThemeIcon();

    function updateThemeIcon() {
        themeToggle.innerHTML = document.body.classList.contains('dark-theme') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    dropArea.addEventListener('drop', handleDrop, false);

    dropArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', handleFiles);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('dragover');
    }

    function unhighlight() {
        dropArea.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function sortLinks(links, criteria) {
        return [...links].sort((a, b) => {
            switch (criteria) {
                case 'name':
                    return b.fileName.localeCompare(a.fileName);
                case 'size':
                    return b.fileSize - a.fileSize;
                case 'date':
                default:
                    return new Date(b.date) - new Date(a.date);
            }
        });
    }

    async function uploadFile(file) {
        if (isUploading || isCurrentFileUploaded) {
            showCustomPopup('Info', 'Upload in progress or file already uploaded.');
            return;
        }
    
        isUploading = true;
        const formData = new FormData();
        formData.append('video', file);
    
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
    
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Upload failed');
            }
    
            displayDownloadLink(result.downloadLink);
            showCustomPopup('Success', 'File uploaded successfully!');
            isCurrentFileUploaded = true;

        } catch (error) {
            console.error('Upload failed:', error);
            showCustomPopup('Error', error.message || 'Upload failed. Please try again.');
        } finally {
            isUploading = false;
        }
    }

    function handleFiles(files) {
        if (files instanceof FileList && files.length > 0) {
            currentFile = files[0];
            isCurrentFileUploaded = false;
            uploadFile(currentFile);
        } else if (files.target && files.target.files.length > 0) {
            currentFile = files.target.files[0];
            isCurrentFileUploaded = false;
            uploadFile(currentFile);
        }
    }

    function displayDownloadLink(downloadLink) {
        downloadLinkInput.value = `${window.location.origin}${downloadLink}`;
        downloadLinkInput.classList.add('has-link');
    }

    downloadLinkInput.addEventListener('click', async () => {
        if (downloadLinkInput.value) {
            try {
                await navigator.clipboard.writeText(downloadLinkInput.value);
                showCustomPopup('Success', 'Download link copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy text: ', err);
                showCustomPopup('Error', 'Failed to copy link. Please try again.');
            }
        } else {
            showCustomPopup('Error', 'No download link available. Please upload a file first.');
        }
    });

    listButton.addEventListener('click', showDownloadLinks);
    uploadNavButton.addEventListener('click', showUploadSection);

    async function showDownloadLinks() {
        document.getElementById('upload-section').classList.remove('active');
        document.getElementById('list-section').classList.add('active');
        
        try {
            const response = await fetch('/get-download-links');
            if (!response.ok) {
                throw new Error(`Failed to fetch download links: ${response.status} ${response.statusText}`);
            }
            allLinks = await response.json();
            updateLinksList(allLinks);
        } catch (error) {
            console.error('Error fetching download links:', error);
            showCustomPopup('Error', 'Failed to fetch download links. Please try again.');
        }
    }

    function filterLinks(query) {
        query = query.toLowerCase();
        return allLinks.filter(link => 
            link.fileName.toLowerCase().includes(query)
        );
    }

    function updateLinksList(links) {
        const sortedLinks = sortLinks(links, currentSortCriteria);
        const emptyState = document.getElementById('emptyState');
        linksList.innerHTML = '';

        if (sortedLinks.length === 0) {
            emptyState.style.display = 'flex';
            clearAllButton.style.display = 'none';
            document.getElementById('paginationControls').style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            clearAllButton.style.display = 'block';
            
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageLinks = sortedLinks.slice(startIndex, endIndex);

            linksList.className = `download-list ${currentView}-view`;

            pageLinks.forEach((item) => {
                const li = document.createElement('div');
                li.className = 'download-item';
                li.innerHTML = `
                    <div class="download-info">
                        <div class="download-name">${item.fileName}</div>
                        <div class="download-meta">
                            ${new Date(item.date).toLocaleString()}
                            ${item.fileSize ? `| Size: ${formatFileSize(item.fileSize)}` : ''}
                        </div>
                    </div>
                    <div class="download-actions">
                        <a href="${window.location.origin}${item.downloadLink}" class="download-button" download>
                            <i class="fas fa-download"></i> Download
                        </a>
                        <button class="copy-button" data-link="${window.location.origin}${item.downloadLink}">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="delete-button" data-fileid="${item.fileId}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;
                linksList.appendChild(li);
            });

            updatePaginationControls(sortedLinks);
        }
    }

    function switchView(view) {
        currentView = view;
        listViewButton.classList.toggle('active', view === 'list');
        gridViewButton.classList.toggle('active', view === 'grid');
        updateLinksList(allLinks);
    }

    listViewButton.addEventListener('click', () => switchView('list'));
    gridViewButton.addEventListener('click', () => switchView('grid'));

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    sortSelect.addEventListener('change', (e) => {
        currentSortCriteria = e.target.value;
        currentPage = 1;
        updateLinksList(allLinks);
    });

    function updatePaginationControls(links) {
        const totalPages = Math.ceil(links.length / itemsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;

        document.getElementById('paginationControls').style.display = totalPages > 1 ? 'flex' : 'none';
    }

    function performSearch() {
        const query = searchInput.value;
        const filteredLinks = filterLinks(query);
        currentPage = 1;
        updateLinksList(filteredLinks);
    }

    function goToNextPage() {
        if (currentPage < Math.ceil(allLinks.length / itemsPerPage)) {
            currentPage++;
            updateLinksList(allLinks);
        }
    }

    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            updateLinksList(allLinks);
        }
    }

    searchButton.addEventListener('click', performSearch);

    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    prevPageButton.addEventListener('click', goToPrevPage);
    nextPageButton.addEventListener('click', goToNextPage);

    linksList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('copy-button')) {
            const link = e.target.getAttribute('data-link');
            try {
                await navigator.clipboard.writeText(link);
                showCustomPopup('Success', 'Link copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy text: ', err);
                showCustomPopup('Error', 'Failed to copy link. Please try again.');
            }
        } else if (e.target.classList.contains('delete-button')) {
            const fileId = e.target.getAttribute('data-fileid');
            try {
                const response = await fetch(`/delete-link/${fileId}`, { method: 'DELETE' });
                if (response.ok) {
                    showDownloadLinks();
                    showCustomPopup('Success', 'Link and file deleted successfully!');
                } else {
                    throw new Error('Failed to delete link and file');
                }
            } catch (error) {
                console.error('Error deleting link and file:', error);
                showCustomPopup('Error', 'Failed to delete link and file. Please try again.');
            }
        }
    });

    clearAllButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/clear-all-links', { method: 'DELETE' });
            if (response.ok) {
                showDownloadLinks();
                showCustomPopup('Success', 'All links cleared successfully!');
            } else {
                throw new Error('Failed to clear all links');
            }
        } catch (error) {
            console.error('Error clearing all links:', error);
            showCustomPopup('Error', 'Failed to clear all links. Please try again.');
        }
    });

    function showUploadSection() {
        document.getElementById('list-section').classList.remove('active');
        document.getElementById('upload-section').classList.add('active');
    }

    function showCustomPopup(title, message) {
        popupTitle.textContent = title;
        popupMessage.textContent = message;
        customPopup.style.display = 'flex';
        setTimeout(() => {
            customPopup.classList.add('active');
        }, 10);
    }

    function hideCustomPopup() {
        customPopup.classList.remove('active');
        setTimeout(() => {
            customPopup.style.display = 'none';
        }, 300);
    }

    popupClose.addEventListener('click', hideCustomPopup);

    customPopup.addEventListener('click', (e) => {
        if (e.target === customPopup) {
            hideCustomPopup();
        }
    });
});