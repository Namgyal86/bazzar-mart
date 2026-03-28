import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  io.Socket? _socket;
  LatLng _agentLocation = const LatLng(27.7172, 85.3240);
  String _agentName = '';
  String _agentPhone = '';
  String _vehicle = '';
  int _etaMinutes = 0;
  String _status = 'IN_TRANSIT';
  bool _loading = true;
  GoogleMapController? _mapController;

  static const _deliveryServiceUrl = String.fromEnvironment('DELIVERY_SERVICE_URL', defaultValue: 'http://10.0.2.2:8013');

  @override
  void initState() {
    super.initState();
    _loadTrackingInfo();
    _connectSocket();
  }

  @override
  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    super.dispose();
  }

  Future<void> _loadTrackingInfo() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/v1/delivery/track/${widget.orderId}');
      final d = res.data['data'];
      setState(() {
        _agentName = d['agentName'] ?? '';
        _agentPhone = d['agentPhone'] ?? '';
        _vehicle = d['vehicle'] ?? '';
        _etaMinutes = d['estimatedMinutes'] ?? 0;
        _status = d['status'] ?? 'IN_TRANSIT';
        if (d['currentLocation'] != null) {
          _agentLocation = LatLng(
            (d['currentLocation']['lat'] as num).toDouble(),
            (d['currentLocation']['lng'] as num).toDouble(),
          );
        }
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _connectSocket() {
    final token = ref.read(authStateProvider).value;
    _socket = io.io(_deliveryServiceUrl, <String, dynamic>{
      'transports': ['websocket'],
      'auth': {'token': token},
    });
    _socket?.on('connect', (_) => _socket?.emit('subscribe_order', widget.orderId));
    _socket?.on('location_update', (data) {
      if (mounted) {
        setState(() {
          _agentLocation = LatLng((data['lat'] as num).toDouble(), (data['lng'] as num).toDouble());
        });
        _mapController?.animateCamera(CameraUpdate.newLatLng(_agentLocation));
      }
    });
    _socket?.on('order:status_changed', (data) {
      if (mounted) setState(() => _status = data['status'] ?? _status);
    });
  }

  @override
  Widget build(BuildContext context) {
    final steps = ['Order Placed', 'Confirmed', 'Picked Up', 'On the Way', 'Delivered'];
    final activeStep = _status == 'DELIVERED' ? 4 : _status == 'IN_TRANSIT' ? 3 : 2;

    return Scaffold(
      appBar: AppBar(title: const Text('Live Tracking')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(children: [
              // Map
              Expanded(
                flex: 3,
                child: GoogleMap(
                  initialCameraPosition: CameraPosition(target: _agentLocation, zoom: 15),
                  markers: {
                    Marker(markerId: const MarkerId('agent'), position: _agentLocation,
                      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
                      infoWindow: InfoWindow(title: _agentName, snippet: _vehicle),
                    ),
                  },
                  onMapCreated: (c) => _mapController = c,
                  myLocationEnabled: true,
                ),
              ),

              // Info panel
              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    // ETA
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEF4444)]),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(children: [
                        const Icon(Icons.access_time_rounded, color: Colors.white, size: 28),
                        const SizedBox(width: 12),
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('$_etaMinutes min away', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                          const Text('Estimated delivery time', style: TextStyle(color: Colors.white70, fontSize: 12)),
                        ]),
                      ]),
                    ),
                    const SizedBox(height: 16),

                    // Agent info
                    if (_agentName.isNotEmpty)
                      Row(children: [
                        CircleAvatar(
                          backgroundColor: const Color(0xFFFFF7ED),
                          child: Text(_agentName[0], style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(_agentName, style: const TextStyle(fontWeight: FontWeight.w600)),
                          Text(_vehicle, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                        ])),
                        IconButton(
                          icon: const Icon(Icons.phone_outlined),
                          onPressed: () {},
                        ),
                      ]),
                    const SizedBox(height: 16),

                    // Progress steps
                    Row(
                      children: List.generate(steps.length * 2 - 1, (i) {
                        if (i.isOdd) return Expanded(child: Container(height: 2, color: i ~/ 2 < activeStep ? const Color(0xFFF97316) : const Color(0xFFE5E7EB)));
                        final stepIdx = i ~/ 2;
                        final done = stepIdx <= activeStep;
                        return Column(children: [
                          Container(
                            width: 20, height: 20,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: done ? const Color(0xFFF97316) : const Color(0xFFE5E7EB),
                            ),
                            child: done ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
                          ),
                          const SizedBox(height: 4),
                          Text(steps[stepIdx], style: TextStyle(fontSize: 9, color: done ? const Color(0xFFF97316) : Colors.grey)),
                        ]);
                      }),
                    ),
                  ]),
                ),
              ),
            ]),
    );
  }
}
