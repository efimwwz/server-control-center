import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import agent


class DefaultNetworkInterfaceTests(unittest.TestCase):
    def test_selects_lowest_metric_default_route(self):
        routes = [
            {"dst": "default", "dev": "backup0", "metric": 200},
            {"dst": "192.168.4.0/24", "dev": "br-lan", "metric": 0},
            {"dst": "default", "dev": "enp1s0", "metric": 100},
        ]
        self.assertEqual(agent._select_default_interface(routes), "enp1s0")

    def test_ignores_default_routes_without_device(self):
        self.assertEqual(
            agent._select_default_interface([{"dst": "default", "metric": 100}]),
            "",
        )

    def test_reads_only_selected_interface_counters(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, rx, tx in (
                ("enp1s0", 1200, 3400),
                ("br-docker", 9000, 12000),
            ):
                stats = root / name / "statistics"
                stats.mkdir(parents=True)
                (stats / "rx_bytes").write_text(str(rx))
                (stats / "tx_bytes").write_text(str(tx))

            self.assertEqual(agent.network_bytes("enp1s0", root), (1200, 3400))

    def test_missing_interface_returns_zero_counters(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(
                agent.network_bytes("missing0", Path(directory)),
                (0, 0),
            )

    def test_network_speed_uses_default_interface_only(self):
        with (
            patch.object(agent, "default_network_interface", return_value="enp1s0"),
            patch.object(agent, "network_bytes", side_effect=[(100, 200), (400, 800)]) as counters,
            patch.object(agent.time, "sleep"),
            patch.object(agent.time, "monotonic", side_effect=[10.0, 10.2]),
        ):
            self.assertEqual(agent.network_speed(), (1500, 3000, "enp1s0"))
            self.assertEqual(
                [call.args[0] for call in counters.call_args_list],
                ["enp1s0", "enp1s0"],
            )


if __name__ == "__main__":
    unittest.main()
