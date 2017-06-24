package com.example.alex.timerdepompe;

import android.app.Dialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.TimePicker;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.UUID;

public class MainActivity extends AppCompatActivity implements DataCallBack {

    private TimePicker timePickerOff;
    private TimePicker timePickerOn;
    private Button button;

    private TextView textView_timeOff;
    private TextView textView_timeOn;

    private Handler bluetoothIn;

    final int handlerState = 0;        				 //used to identify handler message
    private BluetoothAdapter btAdapter = null;
    private BluetoothSocket btSocket = null;
    private StringBuilder recDataString = new StringBuilder();

    private ConnectedThread mConnectedThread;

    // SPP UUID service - this should work for most devices
    private static final UUID BTMODULEUUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    // String for MAC address
    private static String address;



    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        timePickerOff = (TimePicker)findViewById(R.id.timePickerOFF);
        timePickerOn = (TimePicker)findViewById(R.id.timePickerON);


        button = (Button)findViewById(R.id.button);
        timePickerOff.setIs24HourView(true);
        timePickerOn.setIs24HourView(true);

        timePickerOff.setCurrentHour(0);
        timePickerOff.setCurrentMinute(0);

        timePickerOn.setCurrentHour(0);
        timePickerOn.setCurrentMinute(0);

        SharedPreferences sharedPref = getPreferences(Context.MODE_PRIVATE);
        String defaultValueOn = getResources().getString(R.string.default_on_time);
        String defaultValueOff = getResources().getString(R.string.default_off_time);
        String timeOn = sharedPref.getString("timeOn", defaultValueOn);
        String timeOff = sharedPref.getString("timeOff",defaultValueOff );

        timePickerOn.setCurrentMinute(Integer.valueOf(timeOn));
        timePickerOff.setCurrentMinute(Integer.valueOf(timeOff));

        button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mConnectedThread.write(formatMessageToSend());

                String tempsOff = String.valueOf(timePickerOff.getCurrentMinute());
                String tempsOn = String.valueOf(timePickerOn.getCurrentMinute());

                SharedPreferences sharedPref = getPreferences(Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = sharedPref.edit();
                editor.putString("timeOn", tempsOn);
                editor.putString("timeOff", tempsOff);
                editor.commit();
            }
        });


        button.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {


                String newTemps = "";
                String tempsOff = String.valueOf(timePickerOff.getCurrentMinute() * 60);
                String tempsOn = String.valueOf(timePickerOn.getCurrentMinute() * 60);

                SharedPreferences sharedPref = getPreferences(Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = sharedPref.edit();
                editor.putString("timeOn", tempsOn);
                editor.putString("timeOff", tempsOff);
                editor.commit();



                newTemps = tempsOff + "," + tempsOn;
                Toast.makeText(MainActivity.this, newTemps, Toast.LENGTH_SHORT).show();
                //mConnectedThread.write(newTemps);
                FireHackDialog fireHackDialog = new FireHackDialog();
                fireHackDialog.show(getFragmentManager(), "YO");
                fireHackDialog.setDataCallBack(MainActivity.this);
                return true;
            }
        });

        bluetoothIn = new Handler() {
            public void handleMessage(android.os.Message msg) {
                if (msg.what == handlerState) {										//if message is what we want
                    String readMessage = (String) msg.obj;                                                                // msg.arg1 = bytes from connect thread
                    recDataString.append(readMessage);      								//keep appending to string until ~
                    int endOfLineIndex = recDataString.indexOf("~");                    // determine the end-of-line
                    if (endOfLineIndex > 0) {                                           // make sure there data before ~
                        String values[] = readMessage.split(",");
                        textView_timeOff.setText(values[1]);
                        textView_timeOn.setText(values[0]);
                        /*
                        String dataInPrint = recDataString.substring(0, endOfLineIndex);    // extract string
                        textView_timeOff.setText("Data Received = " + dataInPrint);
                        int dataLength = dataInPrint.length();							//get length of data received
                       textView_timeOn.setText("String Length = " + String.valueOf(dataLength));

                        if (recDataString.charAt(0) == '#')								//if it starts with # we know it is what we are looking for
                        {
                            String sensor0 = recDataString.substring(1, 5);             //get sensor value from string between indices 1-5
                            String sensor1 = recDataString.substring(6, 10);            //same again...
                            String sensor2 = recDataString.substring(11, 15);
                            String sensor3 = recDataString.substring(16, 20);

                            sensorView0.setText(" Sensor 0 Voltage = " + sensor0 + "V");	//update the textviews with sensor values
                            sensorView1.setText(" Sensor 1 Voltage = " + sensor1 + "V");
                            sensorView2.setText(" Sensor 2 Voltage = " + sensor2 + "V");
                            sensorView3.setText(" Sensor 3 Voltage = " + sensor3 + "V");
                        */
                        }
                        recDataString.delete(0, recDataString.length()); 					//clear all string data
                        // strIncom =" ";
                        //dataInPrint = " ";
                    }
                }
            //}
        };

        btAdapter = BluetoothAdapter.getDefaultAdapter();       // get Bluetooth adapter
        checkBTState();
    }

    public String formatMessageToSend() {

        String newTemps = "";
        String tempsOff = String.valueOf(timePickerOff.getCurrentMinute() * 60);
        String tempsOn = String.valueOf(timePickerOn.getCurrentMinute() * 60);
        newTemps = tempsOn + "," + tempsOff;
        Toast.makeText(MainActivity.this, newTemps, Toast.LENGTH_SHORT).show();

        return newTemps;

    }



    private BluetoothSocket createBluetoothSocket(BluetoothDevice device) throws IOException {

        return  device.createRfcommSocketToServiceRecord(BTMODULEUUID);
        //creates secure outgoing connecetion with BT device using UUID
    }

    @Override
    public void onPause()
    {
        super.onPause();
        try
        {
            btSocket.close();
        } catch (IOException e2) {
            //insert code to deal with this
        }
    }

    private void checkBTState() {

        if(btAdapter==null) {
            Toast.makeText(getBaseContext(), "Activez Bluetooth svp", Toast.LENGTH_LONG).show();
        } else {
            if (btAdapter.isEnabled()) {
            } else {
                Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
                startActivityForResult(enableBtIntent, 1);
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();

        //Get MAC address from DeviceListActivity via intent
        Intent intent = getIntent();

        //Get the MAC address from the DeviceListActivty via EXTRA
        address = intent.getStringExtra(DeviceListActivity.EXTRA_DEVICE_ADDRESS);
        //create device and set the MAC address
        address = "20:17:02:15:33:27";
        BluetoothDevice device = btAdapter.getRemoteDevice(address);

        try{
            btSocket = createBluetoothSocket(device);
            btSocket.connect();

            mConnectedThread = new ConnectedThread(btSocket);
            mConnectedThread.start();
            mConnectedThread.write("x");
            Toast.makeText(MainActivity.this, "Connecté avec succès", Toast.LENGTH_SHORT).show();
        }
        catch (IOException e) {
            Toast.makeText(MainActivity.this, "Problème de connection", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onSuccess(Object result) {
        Toast.makeText(MainActivity.this, (String)result, Toast.LENGTH_SHORT).show();
        mConnectedThread.write((String)result);
    }

    @Override
    public void onFailure() {

    }


    //create new class for connect thread
    private class ConnectedThread extends Thread {
        private final InputStream mmInStream;
        private final OutputStream mmOutStream;

        //creation of the connect thread
        public ConnectedThread(BluetoothSocket socket) {
            InputStream tmpIn = null;
            OutputStream tmpOut = null;

            try {
                //Create I/O streams for connection
                tmpIn = socket.getInputStream();
                tmpOut = socket.getOutputStream();
            } catch (IOException e) { }

            mmInStream = tmpIn;
            mmOutStream = tmpOut;
        }


        public void run() {
            byte[] buffer = new byte[256];
            int bytes;

            // Keep looping to listen for received messages
            while (true) {
                try {
                    bytes = mmInStream.read(buffer);        	//read bytes from input buffer
                    String readMessage = new String(buffer, 0, bytes);
                    // Send the obtained bytes to the UI Activity via handler
                    bluetoothIn.obtainMessage(handlerState, bytes, -1, readMessage).sendToTarget();
                } catch (IOException e) {
                    break;
                }
            }
        }
        //write method
        public void write(String input) {
            byte[] msgBuffer = input.getBytes();           //converts entered String into bytes
            try {
                mmOutStream.write(msgBuffer);                //write bytes over BT connection via outstream
            } catch (IOException e) {
                //if you cannot write, close the application
                Toast.makeText(getBaseContext(), "write()->Connection Failure", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }
}
