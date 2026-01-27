import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function MapDrawingLayer({
  drawMode,
  onShapeCreated,
  shapes = [],
  paths = []
}) {
  const map = useMap();
  const [currentPoints, setCurrentPoints] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [circleCenter, setCircleCenter] = useState(null);
  const [drawnItems, setDrawnItems] = useState([]);

  // Render existing shapes and paths
  useEffect(() => {
    drawnItems.forEach(item => item.remove());
    const newItems = [];

    // Render polygons
    shapes.forEach(shape => {
      if (shape.type === 'polygon') {
        const poly = L.polyline(shape.points, {
          color: shape.color || '#3b82f6',
          weight: 2,
          opacity: 0.8,
          dashArray: '5, 5'
        }).addTo(map);
        newItems.push(poly);
      } else if (shape.type === 'circle') {
        const circle = L.circle(shape.center, {
          radius: shape.radius,
          color: shape.color || '#10b981',
          weight: 2,
          opacity: 0.6,
          fill: true,
          fillColor: shape.color || '#10b981',
          fillOpacity: 0.1
        }).addTo(map);
        newItems.push(circle);
      }
    });

    // Render paths
    paths.forEach(path => {
      const pathLine = L.polyline(path.points, {
        color: path.color || '#f59e0b',
        weight: 3,
        opacity: 0.9,
        dashArray: '2, 4'
      }).addTo(map);

      // Add waypoint markers
      path.points.forEach((point, idx) => {
        const marker = L.circleMarker(point, {
          radius: 4,
          color: path.color || '#f59e0b',
          weight: 2,
          opacity: 1,
          fill: true,
          fillColor: '#f59e0b',
          fillOpacity: 0.8
        }).addTo(map);

        if (idx === 0) {
          marker.bindPopup(`START`, { className: 'dark-popup', closeButton: false });
        } else if (idx === path.points.length - 1) {
          marker.bindPopup(`END`, { className: 'dark-popup', closeButton: false });
        } else {
          marker.bindPopup(`WP ${idx}`, { className: 'dark-popup', closeButton: false });
        }

        newItems.push(marker);
      });

      newItems.push(pathLine);
    });

    setDrawnItems(newItems);

    return () => {
      newItems.forEach(item => item.remove());
    };
  }, [map, shapes, paths]);

  // Handle map clicks for drawing
  useEffect(() => {
    if (!drawMode) {
      setCurrentPoints([]);
      setCurrentPath([]);
      setCircleCenter(null);
      return;
    }

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;

      if (drawMode === 'polygon') {
        const newPoints = [...currentPoints, [lat, lng]];
        setCurrentPoints(newPoints);

        // Draw temporary marker
        L.circleMarker([lat, lng], {
          radius: 5,
          color: '#3b82f6',
          weight: 2,
          fill: true,
          fillColor: '#3b82f6'
        }).addTo(map);
      } else if (drawMode === 'path') {
        const newPath = [...currentPath, [lat, lng]];
        setCurrentPath(newPath);

        L.circleMarker([lat, lng], {
          radius: 5,
          color: '#f59e0b',
          weight: 2,
          fill: true,
          fillColor: '#f59e0b'
        }).addTo(map);
      } else if (drawMode === 'circle' && !circleCenter) {
        setCircleCenter([lat, lng]);

        // Draw temporary center marker
        L.circleMarker([lat, lng], {
          radius: 6,
          color: '#10b981',
          weight: 2,
          fill: true,
          fillColor: '#10b981'
        }).addTo(map);
      }
    };

    const handleMapDblClick = (e) => {
      e.originalEvent.preventDefault();

      if (drawMode === 'polygon' && currentPoints.length > 2) {
        onShapeCreated({ type: 'polygon', points: currentPoints });
        setCurrentPoints([]);
      } else if (drawMode === 'path' && currentPath.length > 1) {
        onShapeCreated({ type: 'path', points: currentPath });
        setCurrentPath([]);
      }
    };

    const handleMouseMove = (e) => {
      if (drawMode === 'circle' && circleCenter) {
        const distance = map.distance(circleCenter, e.latlng);
        // Update circle preview
      }
    };

    map.on('click', handleMapClick);
    map.on('dblclick', handleMapDblClick);
    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('click', handleMapClick);
      map.off('dblclick', handleMapDblClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [drawMode, currentPoints, currentPath, circleCenter, map, onShapeCreated]);

  return null;
}