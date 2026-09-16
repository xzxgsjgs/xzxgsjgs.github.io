/**
 * projects.js
 * Loads projects.json and renders the project list into #projects-md.
 * JSON-driven: adding a project only requires editing projects.json.
 *
 * Supported fields per project:
 *   title, subtitle, description, tags[], metrics[{value,label}], repo, pdf
 */

(function () {
    'use strict';

    var CONTAINER_ID = 'projects-md';

    function escapeHTML(value) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(String(value)));
        return div.innerHTML;
    }

    function buildTags(tags) {
        if (!tags || !tags.length) {
            return '';
        }
        return '<div class="project-tags">' + tags.map(function (tag) {
            return '<span class="project-tag">' + escapeHTML(tag) + '</span>';
        }).join('') + '</div>';
    }

    function buildMetrics(metrics) {
        if (!metrics || !metrics.length) {
            return '';
        }
        return '<div class="project-metrics">' + metrics.map(function (metric) {
            return '<div class="metric">' +
                '<span class="metric-value">' + escapeHTML(metric.value) + '</span>' +
                '<span class="metric-label">' + escapeHTML(metric.label) + '</span>' +
                '</div>';
        }).join('') + '</div>';
    }

    function buildActions(project) {
        var actions = '';

        if (project.repo) {
            actions += '<a class="btn btn-ghost" href="' + escapeHTML(project.repo) +
                '" target="_blank" rel="noopener noreferrer">' +
                '<i class="ph ph-github-logo" aria-hidden="true"></i>View repository</a>';
        }

        if (project.pdf) {
            actions += '<a class="btn btn-ghost" href="' + escapeHTML(project.pdf) +
                '" target="_blank" rel="noopener noreferrer">' +
                '<i class="ph ph-file-pdf" aria-hidden="true"></i>View case study</a>';
        }

        return actions ? '<div class="project-actions">' + actions + '</div>' : '';
    }

    function buildProjectHTML(project) {
        var subtitle = project.subtitle ?
            '<div class="project-subtitle">' + escapeHTML(project.subtitle) + '</div>' : '';
        var description = project.description ?
            '<p class="project-description">' + escapeHTML(project.description) + '</p>' : '';

        return '<article class="project">' +
            '<div class="project-main">' +
            '<h3 class="project-title">' + escapeHTML(project.title) + '</h3>' +
            subtitle +
            description +
            buildTags(project.tags) +
            buildMetrics(project.metrics) +
            '</div>' +
            buildActions(project) +
            '</article>';
    }

    function renderProjects(projects) {
        var container = document.getElementById(CONTAINER_ID);
        if (!container) {
            return;
        }

        if (!projects || !projects.length) {
            container.innerHTML = '<div class="project-empty">No projects published yet.</div>';
            return;
        }

        container.innerHTML = '<div class="project-list">' +
            projects.map(buildProjectHTML).join('') + '</div>';
    }

    function showError() {
        var container = document.getElementById(CONTAINER_ID);
        if (container) {
            container.innerHTML = '<div class="project-empty">Projects could not be loaded right now.</div>';
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        fetch('projects.json')
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to load projects.json: ' + response.status);
                }
                return response.json();
            })
            .then(renderProjects)
            .catch(function (error) {
                console.error('Projects loader error:', error);
                showError();
            });
    });
})();
