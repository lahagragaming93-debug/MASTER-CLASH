// ===========================================================
// ÉDITEUR DE TEMPLATE DE CONTRAT (sous-commit 6b)
// ===========================================================
// Ouvre depuis admin.html via ?id=<tplId> ou ?clone=<tplId> ou rien (création vierge)

(function(){
  // Vérifier que l'utilisateur est admin
  var u = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!u || !u.isAdmin){
    setTimeout(function(){
      mcAlert('🚫 Cette page est réservée à l\'administrateur.', { title: 'Accès refusé' }).then(function(){
        location.replace('index.html');
      });
    }, 100);
    return;
  }

  var params = new URLSearchParams(location.search);
  var editId = params.get('id');
  var cloneId = params.get('clone');
  var current = null;
  var isNew = !editId;

  if (editId){
    var existing = getTemplate(editId);
    if (!existing){ mcAlert('Template introuvable.').then(function(){ location.href='admin.html'; }); return; }
    current = JSON.parse(JSON.stringify(existing));
    document.getElementById('tpl-editor-mode').textContent = '— Modification';
  } else if (cloneId){
    var src = getTemplate(cloneId);
    if (src){
      current = JSON.parse(JSON.stringify(src));
      current.id = 'custom-' + Date.now();
      current.label = 'Copie de ' + current.label;
      current.ref = current.ref.replace(/-\d{4}$/, '-' + new Date().getFullYear()) + '-COPIE';
      document.getElementById('tpl-editor-mode').textContent = '— Duplication';
    }
  }
  if (!current){
    // Création vierge : on part d'un Esthétique simplifié comme base
    current = {
      id: 'custom-' + Date.now(),
      label: 'Nouveau contrat',
      icon: '📄',
      ref: 'MC-NEW-2026',
      sectorSubs: ['Secteur — Master Clash', 'État de San Andreas'],
      blocks: [
        { type: 'h3', text: 'Préambule' },
        { type: 'p', html: 'Le présent contrat est conclu entre l\'Organisation <strong>Master Clash</strong> et le Partenaire ci-après désigné.' },
        { type: 'h3', text: 'Identification du partenaire' },
        { type: 'fieldRow', fields: [
          { label: 'Nom de l\'enseigne', input: { type: 'text', placeholder: 'Nom de l\'enseigne' } },
          { label: 'Téléphone', input: { type: 'text', placeholder: 'Numéro de téléphone' } }
        ]},
        { type: 'h3', text: 'Article 1 — Engagements du Partenaire' },
        { type: 'p', text: 'À compléter…' },
        { type: 'h3', text: 'Article 2 — Contreparties' },
        { type: 'ul', items: ['Mention sur les supports', 'Visibilité événementielle'] }
      ],
      signature: { organizerLabel: 'Pour l\'Organisateur', partnerLabel: 'Pour le Partenaire' },
      footer: 'MASTER CLASH — Document officiel — État de San Andreas'
    };
    document.getElementById('tpl-editor-mode').textContent = '— Création';
  }

  // ===== Render preview =====
  function refreshPreview(){
    var doc = document.getElementById('tpl-preview-doc');
    doc.innerHTML = buildContractHTML(current);
  }

  // ===== Render form =====
  function renderForm(){
    var f = document.getElementById('tpl-editor-form');
    var html = '';

    // Métadonnées
    html += '<div class="tpl-section"><h3>📋 Métadonnées</h3>';
    html += '<label class="auth-label">Identifiant (id, non modifiable une fois créé)</label>';
    html += '<input type="text" class="auth-input" id="meta-id" ' + (isNew ? '' : 'disabled') + ' value="' + escAttr(current.id) + '">';
    html += '<label class="auth-label">Titre du contrat</label>';
    html += '<input type="text" class="auth-input" id="meta-label" value="' + escAttr(current.label) + '">';
    html += '<label class="auth-label">Icône (emoji)</label>';
    html += '<input type="text" class="auth-input" id="meta-icon" maxlength="3" value="' + escAttr(current.icon) + '" style="width:80px">';
    html += '<label class="auth-label">Référence</label>';
    html += '<input type="text" class="auth-input" id="meta-ref" value="' + escAttr(current.ref) + '">';
    html += '<label class="auth-label">Sous-titre 1 du header</label>';
    html += '<input type="text" class="auth-input" id="meta-sub1" value="' + escAttr((current.sectorSubs || [])[0] || '') + '">';
    html += '<label class="auth-label">Sous-titre 2 du header</label>';
    html += '<input type="text" class="auth-input" id="meta-sub2" value="' + escAttr((current.sectorSubs || [])[1] || '') + '">';
    html += '<label class="auth-label">Label "Pour l\'Organisateur" (à gauche)</label>';
    html += '<input type="text" class="auth-input" id="meta-orglabel" value="' + escAttr((current.signature || {}).organizerLabel || 'Pour l\'Organisateur') + '">';
    html += '<label class="auth-label">Label "Pour le Partenaire" (à droite)</label>';
    html += '<input type="text" class="auth-input" id="meta-partlabel" value="' + escAttr((current.signature || {}).partnerLabel || 'Pour le Partenaire') + '">';
    html += '<label class="auth-label">Footer (bas du contrat)</label>';
    html += '<input type="text" class="auth-input" id="meta-footer" value="' + escAttr(current.footer || '') + '">';
    html += '</div>';

    // Blocs
    html += '<div class="tpl-section"><h3>🧱 Blocs du contrat <span style="font-size:12px;color:#6a7a8a;font-weight:400">(' + current.blocks.length + ')</span></h3>';
    html += '<p style="font-size:12px;color:#aabbc8;margin-bottom:12px">L\'ajout/suppression/réorganisation des blocs sera disponible au prochain commit. Pour l\'instant, vous pouvez modifier le contenu de chaque bloc existant.</p>';
    current.blocks.forEach(function(b, i){
      html += '<div class="tpl-block" data-idx="' + i + '">';
      html += '<div class="tpl-block-head"><strong>#' + (i+1) + ' — ' + b.type + '</strong>' + (b.optional ? ' <span class="tpl-badge-opt">optionnel</span>' : '') + '</div>';
      html += renderBlockEditor(b, i);
      html += '</div>';
    });
    html += '</div>';

    f.innerHTML = html;

    // Attacher les events de mise à jour live
    attachFormHandlers();
  }

  function renderBlockEditor(b, i){
    var s = '';
    switch(b.type){
      case 'h3':
      case 'h4':
        s += '<label class="auth-label">Titre</label>';
        s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="text" value="' + escAttr(b.text || '') + '">';
        break;
      case 'p':
        s += '<label class="auth-label">Paragraphe (HTML autorisé : &lt;strong&gt;, &lt;em&gt;…)</label>';
        s += '<textarea class="auth-input tpl-input" data-idx="' + i + '" data-key="html" rows="3" style="resize:vertical">' + escAttr(b.html || b.text || '') + '</textarea>';
        break;
      case 'fieldLabel':
        s += '<label class="auth-label">Texte du label</label>';
        s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="text" value="' + escAttr(b.text || '') + '">';
        break;
      case 'textarea':
        s += '<label class="auth-label">Placeholder du textarea</label>';
        s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="input.placeholder" value="' + escAttr((b.input || {}).placeholder || '') + '">';
        break;
      case 'fieldRow':
        s += '<label class="auth-label">Champs côte à côte</label>';
        (b.fields || []).forEach(function(f, j){
          s += '<div class="tpl-subblock">';
          s += '<label class="auth-label">Label du champ ' + (j+1) + '</label>';
          s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="fields.' + j + '.label" value="' + escAttr(f.label || '') + '">';
          s += '<label class="auth-label">Placeholder</label>';
          s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="fields.' + j + '.input.placeholder" value="' + escAttr((f.input || {}).placeholder || '') + '">';
          if (f.input && f.input.value !== undefined){
            s += '<label class="auth-label">Valeur par défaut</label>';
            s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="fields.' + j + '.input.value" value="' + escAttr(f.input.value) + '">';
          }
          s += '</div>';
        });
        break;
      case 'inlineP':
        s += '<label class="auth-label">Paragraphe avec champs intégrés</label>';
        (b.segments || []).forEach(function(seg, j){
          if (seg.kind === 'text'){
            s += '<label class="auth-label">Texte (' + (j+1) + ')</label>';
            s += '<textarea class="auth-input tpl-input" data-idx="' + i + '" data-key="segments.' + j + '.value" rows="2" style="resize:vertical">' + escAttr(seg.value || '') + '</textarea>';
          } else if (seg.kind === 'html'){
            s += '<label class="auth-label">HTML inline (' + (j+1) + ')</label>';
            s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="segments.' + j + '.value" value="' + escAttr(seg.value || '') + '">';
          } else if (seg.kind === 'input'){
            var inp = seg.input || {};
            s += '<div class="tpl-subblock"><strong style="font-size:11px;color:#00d4ff;text-transform:uppercase;letter-spacing:1px">Input ' + (j+1) + ' (' + (inp.type || 'text') + ')</strong>';
            s += '<label class="auth-label">Placeholder</label>';
            s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="segments.' + j + '.input.placeholder" value="' + escAttr(inp.placeholder || '') + '">';
            if (inp.value !== undefined){
              s += '<label class="auth-label">Valeur par défaut</label>';
              s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="segments.' + j + '.input.value" value="' + escAttr(inp.value) + '">';
            }
            s += '</div>';
          }
        });
        break;
      case 'ul':
        s += '<label class="auth-label">Items de la liste (un par ligne, HTML autorisé)</label>';
        var lines = (b.items || []).map(function(it){
          if (typeof it === 'string') return it;
          if (it.html) return it.html + (it.input ? ' [INPUT]' : '');
          return JSON.stringify(it);
        }).join('\n');
        s += '<textarea class="auth-input tpl-input" data-idx="' + i + '" data-key="ul.items" rows="' + Math.max(3, (b.items||[]).length) + '" style="resize:vertical">' + escAttr(lines) + '</textarea>';
        s += '<p style="font-size:11px;color:#6a7a8a;margin-top:4px">⚠ Si la liste contient des inputs inline, l\'édition fine sera disponible au prochain commit.</p>';
        break;
      case 'checkboxes':
        s += '<label class="auth-label">Cases à cocher (label par ligne, préfixe * pour cochée par défaut)</label>';
        var cbLines = (b.items || []).map(function(it){
          return (it.checked ? '* ' : '') + (it.label || '');
        }).join('\n');
        s += '<textarea class="auth-input tpl-input" data-idx="' + i + '" data-key="checkboxes.items" rows="' + Math.max(2, (b.items||[]).length) + '" style="resize:vertical">' + escAttr(cbLines) + '</textarea>';
        break;
      default:
        s += '<p style="font-size:11px;color:#aabbc8">Type "' + b.type + '" — édition non disponible pour ce type.</p>';
    }
    return s;
  }

  function attachFormHandlers(){
    document.querySelectorAll('.tpl-input').forEach(function(el){
      el.addEventListener('input', function(){
        var idx = parseInt(el.dataset.idx, 10);
        var key = el.dataset.key;
        var val = el.value;
        applyChange(idx, key, val);
        refreshPreview();
      });
    });
    // Métadonnées
    var bind = function(id, applyFn){
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function(){ applyFn(el.value); refreshPreview(); });
    };
    bind('meta-id', function(v){ if (isNew) current.id = v; });
    bind('meta-label', function(v){ current.label = v; });
    bind('meta-icon', function(v){ current.icon = v; });
    bind('meta-ref', function(v){ current.ref = v; });
    bind('meta-sub1', function(v){ current.sectorSubs[0] = v; });
    bind('meta-sub2', function(v){ current.sectorSubs[1] = v; });
    bind('meta-orglabel', function(v){ current.signature.organizerLabel = v; });
    bind('meta-partlabel', function(v){ current.signature.partnerLabel = v; });
    bind('meta-footer', function(v){ current.footer = v; });
  }

  function applyChange(idx, key, val){
    var b = current.blocks[idx];
    if (!b) return;
    if (key === 'text' || key === 'html'){
      b[key] = val;
      // Pour les paragraphes, si on a un html, on retire le text et vice-versa
      if (key === 'html' && b.text) delete b.text;
      if (key === 'text' && b.html) delete b.html;
    } else if (key.indexOf('input.') === 0){
      var sub = key.replace('input.', '');
      if (!b.input) b.input = {};
      b.input[sub] = val;
    } else if (key.indexOf('fields.') === 0){
      var parts = key.split('.');
      var fIdx = parseInt(parts[1], 10);
      var subKey = parts.slice(2).join('.');
      if (!b.fields[fIdx]) return;
      if (subKey === 'label') b.fields[fIdx].label = val;
      else if (subKey.indexOf('input.') === 0){
        if (!b.fields[fIdx].input) b.fields[fIdx].input = {};
        b.fields[fIdx].input[subKey.replace('input.', '')] = val;
      }
    } else if (key.indexOf('segments.') === 0){
      var sParts = key.split('.');
      var sIdx = parseInt(sParts[1], 10);
      var sKey = sParts.slice(2).join('.');
      if (!b.segments[sIdx]) return;
      if (sKey === 'value') b.segments[sIdx].value = val;
      else if (sKey.indexOf('input.') === 0){
        if (!b.segments[sIdx].input) b.segments[sIdx].input = {};
        b.segments[sIdx].input[sKey.replace('input.', '')] = val;
      }
    } else if (key === 'ul.items'){
      b.items = val.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
    } else if (key === 'checkboxes.items'){
      b.items = val.split('\n').map(function(l){
        l = l.trim();
        if (!l) return null;
        var checked = false;
        if (l.indexOf('*') === 0){ checked = true; l = l.substring(1).trim(); }
        return { label: l, checked: checked };
      }).filter(Boolean);
    }
  }

  function escAttr(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ===== Sauvegarde =====
  window.saveCurrentTemplate = function(){
    if (!current.id || !current.id.match(/^[a-z0-9_-]+$/i)){
      mcAlert('⚠ L\'identifiant doit contenir uniquement lettres, chiffres, tirets et underscores.', { title: 'Erreur' });
      return;
    }
    if (!current.label){ mcAlert('⚠ Le titre est obligatoire.', { title: 'Erreur' }); return; }
    if (!current.ref){ mcAlert('⚠ La référence est obligatoire.', { title: 'Erreur' }); return; }
    var list = getTemplates();
    if (isNew){
      // Vérifier l'unicité de l'id
      if (list.find(function(t){ return t.id === current.id; })){
        mcAlert('⚠ Cet identifiant existe déjà : choisissez-en un autre.', { title: 'Erreur' });
        return;
      }
      list.push(current);
    } else {
      var idx = list.findIndex(function(t){ return t.id === current.id; });
      if (idx === -1){
        list.push(current);
      } else {
        list[idx] = current;
      }
    }
    saveTemplates(list);
    if (typeof logAction === 'function') logAction(isNew ? 'Template créé' : 'Template modifié', current.label);
    mcAlert('✓ Template sauvegardé.', { title: 'Succès' }).then(function(){
      location.href = 'admin.html';
    });
  };

  window.cancelTemplateEdit = function(){
    mcConfirm('Annuler les modifications ?\nLes changements non sauvegardés seront perdus.', { okText: 'Annuler les modifs' }).then(function(ok){
      if (!ok) return;
      location.href = 'admin.html';
    });
  };

  // ===== Init =====
  setTimeout(function(){
    renderForm();
    refreshPreview();
  }, 100);
})();
