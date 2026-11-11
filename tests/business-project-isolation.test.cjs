'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const manager = fs.readFileSync('pelex_projects.js','utf8');
const index = fs.readFileSync('index.html','utf8');
const base = fs.readFileSync('supabase/migrations/20261111_business_project_isolation.sql','utf8');
const ops = fs.readFileSync('supabase/migrations/20261111_business_project_operations.sql','utf8');

test('project manager JavaScript parses and is loaded by the main frontend',()=>{
 assert.doesNotThrow(()=>new vm.Script(manager));
 assert.match(index,/<script src="\/pelex_projects\.js\?v=1"><\/script>/);
});

test('project setup is dynamic for every configured business type',()=>{
 assert.match(manager,/from\('business_types'\)/);
 assert.match(manager,/p_business_type:code/);
 assert.match(manager,/p_profile:profile/);
 assert.match(manager,/p_reporting_cycle:cycle/);
 assert.match(manager,/save_setup_project_v2/);
});

test('project selection is persisted and drives the transaction register',()=>{
 assert.match(manager,/px_project_/);
 assert.match(manager,/picker\.value=selected/);
 assert.match(manager,/picker\.dispatchEvent/);
 assert.match(index,/p_project:el\('pxFProject'\)\.value/);
 assert.doesNotMatch(index,/>Unassigned<\/option>/);
});

test('operational records are project-scoped and only enabled modules can write',()=>{
 assert.match(ops,/business_project_records/);
 assert.match(ops,/p_module=any\(mods\)/);
 assert.match(ops,/business_add_project_record/);
 assert.match(ops,/business_list_project_records/);
});

test('ledger, uploads, agreements, devices and pairing codes require project ownership',()=>{
 for(const t of ['ledger_entries','uploads','agreements','devices','pairing_codes']){
  assert.match(ops,new RegExp('alter table public\\.'+t+' alter column project_id set not null|alter table public\\.'+t+' add column if not exists project_id uuid'));
 }
 assert.match(base,/foreign key \(project_id, workspace_id\)/);
 assert.match(ops,/foreign key \(project_id,workspace_id\)/);
});

test('loan creation, repayments and savings releases preserve their project',()=>{
 assert.match(base,/create_agreement_for_project/);
 assert.match(ops,/record_payment/);
 assert.match(ops,/ag\.project_id/);
 assert.match(ops,/release_savings/);
});

test('uploads cannot import records into a different project from the source file',()=>{
 assert.match(ops,/pid is distinct from upload_project/);
 assert.match(index,/project_id:projectId/);
});
