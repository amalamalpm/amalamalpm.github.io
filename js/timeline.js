/**
 * GEDCOM Family Tree Editor
 * Copyright (c) 2024-2026 amalamalpm
 * Licensed under MIT License - see LICENSE.txt
 * 
 * Timeline Visualization Module
 */

/**
 * Extract all dated events from GEDCOM data
 * @returns {Array} Array of events with date, person, type
 */
function extractEvents() {
  const gedcomData = document.dataParsed;
  if (!gedcomData || !gedcomData.indviduals) return [];
  
  const events = [];
  
  gedcomData.indviduals.forEach((person, id) => {
    const name = person.NAME?.value?.replace(/\//g, ' ').trim() || 'Unknown';
    
    // Birth
    if (person.BIRT?.DATE?.value) {
      events.push({
        date: person.BIRT.DATE.value,
        year: extractYear(person.BIRT.DATE.value),
        type: 'Birth',
        person: name,
        personId: id,
        place: person.BIRT.PLAC?.value || '',
        icon: '👶'
      });
    }
    
    // Death
    if (person.DEAT?.DATE?.value) {
      events.push({
        date: person.DEAT.DATE.value,
        year: extractYear(person.DEAT.DATE.value),
        type: 'Death',
        person: name,
        personId: id,
        place: person.DEAT.PLAC?.value || '',
        icon: '✝️'
      });
    }
    
    // Christening
    if (person.CHR?.DATE?.value) {
      events.push({
        date: person.CHR.DATE.value,
        year: extractYear(person.CHR.DATE.value),
        type: 'Christening',
        person: name,
        personId: id,
        place: person.CHR.PLAC?.value || '',
        icon: '⛪'
      });
    }
    
    // Burial
    if (person.BURI?.DATE?.value) {
      events.push({
        date: person.BURI.DATE.value,
        year: extractYear(person.BURI.DATE.value),
        type: 'Burial',
        person: name,
        personId: id,
        place: person.BURI.PLAC?.value || '',
        icon: '🪦'
      });
    }
  });
  
  // Family events (marriages)
  if (gedcomData.families) {
    gedcomData.families.forEach((family, id) => {
      if (family.MARR?.DATE?.value) {
        let husbandName = '';
        let wifeName = '';
        
        // Get husband name (handle both array and single object)
        if (family.HUSB) {
          const husbList = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
          const husbNames = husbList.map(h => {
            const husb = gedcomData.indviduals.get(h.id);
            return husb?.NAME?.value?.replace(/\//g, ' ').trim() || '';
          }).filter(n => n);
          husbandName = husbNames.join(', ');
        }
        
        // Get wife name (handle both array and single object)
        if (family.WIFE) {
          const wifeList = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
          const wifeNames = wifeList.map(w => {
            const wife = gedcomData.indviduals.get(w.id);
            return wife?.NAME?.value?.replace(/\//g, ' ').trim() || '';
          }).filter(n => n);
          wifeName = wifeNames.join(', ');
        }
        
        // Build couple display string
        let couple = '';
        if (husbandName && wifeName) {
          couple = `${husbandName} 💍 ${wifeName}`;
        } else if (husbandName) {
          couple = husbandName;
        } else if (wifeName) {
          couple = wifeName;
        } else {
          couple = 'Unknown couple';
        }
        
        events.push({
          date: family.MARR.DATE.value,
          year: extractYear(family.MARR.DATE.value),
          type: 'Marriage',
          person: couple,
          personId: id,
          place: family.MARR.PLAC?.value || '',
          icon: '💒'
        });
      }
    });
  }
  
  // Sort by year
  events.sort((a, b) => (a.year || 0) - (b.year || 0));
  
  return events;
}

/**
 * Extract year from GEDCOM date
 */
function extractYear(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/\b(\d{4})\b/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Generate timeline HTML
 * @param {Array} events - Array of events
 * @returns {string} HTML string
 */
function generateTimelineHTML(events) {
  if (!events || events.length === 0) {
    return '<p class="placeholder-text">No dated events found in the family tree.</p>';
  }
  
  // Group events by decade
  const decades = new Map();
  events.forEach(event => {
    if (event.year) {
      const decade = Math.floor(event.year / 10) * 10;
      if (!decades.has(decade)) {
        decades.set(decade, []);
      }
      decades.get(decade).push(event);
    }
  });
  
  let html = '<div class="timeline">';
  
  // Convert to array and sort
  const sortedDecades = Array.from(decades.entries()).sort((a, b) => a[0] - b[0]);
  
  sortedDecades.forEach(([decade, decadeEvents]) => {
    html += `<div class="timeline-decade">
      <div class="timeline-decade-label">${decade}s</div>
      <div class="timeline-events">`;
    
    decadeEvents.forEach(event => {
      html += `
        <div class="timeline-event" onclick="goToSearchResult('${event.personId}'); closeTimelineModal();">
          <span class="timeline-icon">${event.icon}</span>
          <div class="timeline-event-content">
            <div class="timeline-event-date">${event.date}</div>
            <div class="timeline-event-title">${event.type}: ${event.person}</div>
            ${event.place ? `<div class="timeline-event-place">${event.place}</div>` : ''}
          </div>
        </div>`;
    });
    
    html += '</div></div>';
  });
  
  html += '</div>';
  
  // Add summary
  const years = events.filter(e => e.year).map(e => e.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  
  html = `<div class="timeline-summary">
    <span>${events.length} events</span>
    <span>${minYear} - ${maxYear}</span>
  </div>` + html;
  
  return html;
}

export { extractEvents, generateTimelineHTML };
