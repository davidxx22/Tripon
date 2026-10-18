import {validateData,newTracker,tripTotal} from './core.js';
export const LEGACY_TRIP='original-trip';
export function workspaceFrom(raw){
  if(raw?.version===1){const trip=validateData(raw);return {version:2,theme:trip.theme,selectedTripId:LEGACY_TRIP,trips:[{id:LEGACY_TRIP,...trip}]};}
  if(raw?.version!==2||!Array.isArray(raw.trips)||raw.trips.length>50||!['system','light','dark'].includes(raw.theme))throw new Error('Invalid backup: include 0–50 trips and a valid appearance.');
  const ids=new Set();
  const trips=raw.trips.map(trip=>{if(typeof trip.id!=='string'||! /^[a-zA-Z0-9-]{1,80}$/.test(trip.id)||['__proto__','constructor','prototype'].includes(trip.id)||ids.has(trip.id))throw new Error('Invalid backup: duplicate or invalid trip ID.');ids.add(trip.id);return {id:trip.id,...validateData({...trip,version:1,theme:raw.theme})};});
  if(trips.length?!ids.has(raw.selectedTripId):raw.selectedTripId!==null)throw new Error('Invalid backup: selected trip does not exist.');
  return {version:2,theme:raw.theme,selectedTripId:raw.selectedTripId,trips};
}
export const currentTrip=workspace=>workspace.trips.find(t=>t.id===workspace.selectedTripId)||workspace.trips[0];
export const workspaceTotal=raw=>workspaceFrom(raw).trips.reduce((sum,t)=>sum+tripTotal(t),0);
export function newWorkspace(demo=false){return workspaceFrom(newTracker(demo));}
export function removeTrip(workspace,id){
  if(!workspace.trips.some(t=>t.id===id))throw new Error('This trip no longer exists.');
  workspace.trips=workspace.trips.filter(t=>t.id!==id);
  if(workspace.selectedTripId===id)workspace.selectedTripId=workspace.trips[0]?.id??null;
}
