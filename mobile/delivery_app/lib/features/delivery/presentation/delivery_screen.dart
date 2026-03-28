import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

class DeliveryScreen extends ConsumerStatefulWidget {
  const DeliveryScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends ConsumerState<DeliveryScreen> {
  GoogleMapController? _mapController;
  io.Socket? _socket;
  StreamSubscription<Position>? _positionSub;
  LatLng _agentLocation = const LatLng(27.7172, 85.3240);
  LatLng? _destinationLocation;
  Map<String, dynamic>? _order;
  bool _loading = true, _completing = false;

  static const _deliveryServiceUrl = String.fromEnvironment('DELIVERY_SERVICE_URL', defaultValue: 'http://10.0.2.2:8013');

  @override
  void initState() {
    super.initState();
    _loadOrder();
    _startLocationTracking();
    _connectSocket();
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    _socket?.disconnect();
    _socket?.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _loadOrder() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/v1/delivery/orders/${widget.orderId}');
      final o = res.data['data'];
      setState(() {
        _order = o as Map<String, dynamic>?;
        final addr = o?['shippingAddress'];
        if (addr?['lat'] != null && addr?['lng'] != null) {
          _destinationLocation = LatLng((addr!['lat'] as num).toDouble(), (addr['lng'] as num).toDouble());
        }
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _startLocationTracking() async {
    final perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;

    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10),
    ).listen((pos) {
      final loc = LatLng(pos.latitude, pos.longitude);
      if (mounted) {
        setState(() => _agentLocation = loc);
        _mapController?.animateCamera(CameraUpdate.newLatLng(loc));
      }
      _socket?.emit('location_update', {
        'orderId': widget.orderId,
        'lat': pos.latitude,
        'lng': pos.longitude,
      });
    });
  }

  void _connectSocket() {
    final token = ref.read(authStateProvider).value;
    _socket = io.io(_deliveryServiceUrl, <String, dynamic>{
      'transports': ['websocket'],
      'auth': {'token': token},
    });
    _socket?.on('connect', (_) => _socket?.emit('agent_active', {'orderId': widget.orderId}));
  }

  Future<void> _completeDelivery() async {
    setState(() => _completing = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/api/v1/delivery/orders/${widget.orderId}/complete');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Delivery completed!'), backgroundColor: Color(0xFF059669)));
        context.go('/home');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _completing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final address = _order?['shippingAddress'] as Map<String, dynamic>?;
    final customerPhone = _order?['customerPhone'] as String?;

    return Scaffold(
      appBar: AppBar(title: Text('Delivery #${widget.orderId.length > 8 ? widget.orderId.substring(widget.orderId.length - 8) : widget.orderId}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(children: [
              Expanded(
                flex: 3,
                child: GoogleMap(
                  initialCameraPosition: CameraPosition(target: _agentLocation, zoom: 15),
                  myLocationEnabled: true,
                  myLocationButtonEnabled: true,
                  markers: {
                    Marker(
                      markerId: const MarkerId('agent'),
                      position: _agentLocation,
                      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
                      infoWindow: const InfoWindow(title: 'You'),
                    ),
                    if (_destinationLocation != null)
                      Marker(
                        markerId: const MarkerId('destination'),
                        position: _destinationLocation!,
                        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                        infoWindow: InfoWindow(title: address?['city'] ?? 'Destination'),
                      ),
                  },
                  onMapCreated: (c) => _mapController = c,
                ),
              ),

              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    if (address != null) ...[
                      Row(children: [
                        const Icon(Icons.location_on_rounded, color: Color(0xFF2563EB), size: 20),
                        const SizedBox(width: 8),
                        Expanded(child: Text(
                          '${address['street'] ?? ''}, ${address['city'] ?? ''}',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        )),
                      ]),
                      const SizedBox(height: 12),
                    ],
                    if (customerPhone != null)
                      Row(children: [
                        const Icon(Icons.phone_outlined, size: 18, color: Colors.grey),
                        const SizedBox(width: 8),
                        Text(customerPhone, style: const TextStyle(color: Colors.grey)),
                      ]),
                    const Spacer(),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _completing ? null : _completeDelivery,
                        icon: const Icon(Icons.check_circle_outline_rounded),
                        label: _completing
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Mark as Delivered', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: const Color(0xFF059669),
                        ),
                      ),
                    ),
                  ]),
                ),
              ),
            ]),
    );
  }
}
