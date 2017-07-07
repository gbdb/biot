package com.example.alex.myapplication.communication.daos;

import android.content.Context;

import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.parsers.BiotEntityParser;

import org.eclipse.paho.android.service.MqttAndroidClient;
import org.eclipse.paho.client.mqttv3.IMqttActionListener;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.IMqttToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;

/**Librarie client MQTT trouvé sur Github...à tester!*/
public class MQTTBiotDAO extends DAO {

    public MQTTBiotDAO(Context context) {
        super(context);

        final MqttAndroidClient mqttAndroidClient = new MqttAndroidClient(context, "tcp://localhost:3000", "Jardin");
        mqttAndroidClient.setCallback(new MqttCallback() {
            @Override
            public void connectionLost(Throwable cause) {
                System.out.println("Connection was lost!");
            }

            @Override
            public void messageArrived(String topic, MqttMessage message) throws Exception {
                System.out.println("Message Arrived!: " + topic + ": " + new String(message.getPayload()));
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {
                System.out.println("Delivery Complete!");
            }
        });

        try {
            mqttAndroidClient.connect(null, new IMqttActionListener() {
                @Override
                public void onSuccess(IMqttToken asyncActionToken) {
                    System.out.println("Connection Success!");
                    try {
                        System.out.println("Subscribing to /test");
                        mqttAndroidClient.subscribe("/test", 0);
                        System.out.println("Subscribed to /test");
                        System.out.println("Publishing message..");
                        mqttAndroidClient.publish("/test", new MqttMessage("Hello world!".getBytes()));
                    } catch (MqttException ex) {}
                }
                @Override
                public void onFailure(IMqttToken asyncActionToken, Throwable exception) {
                    System.out.println("Connection Failure!");
                }


            });
        } catch (MqttException ex) {}
    }

    @Override
    public void fetchAll(BiotDataCallback biotDataCallback, BiotEntityParser parser) {

    }

    @Override
    public boolean create(Biot biot) {
        return false;
    }

    @Override
    public void update(Biot biot, BiotEntityParser parser, BiotDataCallback biotDataCallback) {

    }

}