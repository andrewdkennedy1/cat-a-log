/**
 * Test file to verify all dependencies are properly installed and configured
 * This file can be deleted after verification
 */

// Test Leaflet imports
import L from 'leaflet';
import 'leaflet.markercluster';

// Test idb-keyval import
import { get, set, del } from 'idb-keyval';

// Test uuid import
import { v4 as uuidv4 } from 'uuid';

// Test clsx import
import clsx from 'clsx';

// Test that TypeScript types are working
const testLeafletMap = (): L.Map | null => {
  if (typeof window !== 'undefined') {
    return L.map('test');
  }
  return null;
};

const testMarkerCluster = (): L.MarkerClusterGroup => {
  return L.markerClusterGroup();
};

const testIdbKeyval = async (): Promise<void> => {
  await set('test-key', 'test-value');
  const value = await get('test-key');
  console.log('IDB test value:', value);
  await del('test-key');
};

const testUuid = (): string => {
  return uuidv4();
};

const testClsx = (): string => {
  return clsx('class1', { 'class2': true, 'class3': false });
};

// Export test functions for verification
export {
  testLeafletMap,
  testMarkerCluster,
  testIdbKeyval,
  testUuid,
  testClsx
};

console.log('All dependencies imported successfully!');