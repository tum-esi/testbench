from time import sleep
from flask import Flask
from sense_hat import SenseHat

sense = SenseHat()
app = Flask(__name__)
red = (255, 0, 0)

# handles /dispmsg/ItsMe-blue
@app.route("/dispmsg/<string:msg>")
def dispmsg(msg):
    sense.clear()
    s = msg.split("-")
    if s[1] == "blue":
        sense.show_message(s[0], text_colour=[0,0,255])
    elif s[1] == "red":
        sense.show_message(s[0], text_colour=[255,0,0])
    elif s[1] == "green":
        sense.show_message(s[0], text_colour=[0,255,0])
    else:
        sense.show_message(s[0], text_colour=[100,100,100])
    # sleep(3)
    sense.clear()
    return "done"

@app.route("/gettemp")
def gettemp():
    temp = sense.get_temperature()
    return str(temp)

@app.route("/")
def hello():
    sense.clear()  # no arguments defaults to off
    sleep(1)
    sense.clear(red)  # passing in an RGB tuple
    sleep(1)
    sense.clear(255, 255, 255)  # passing in r, g and b values of a colour
    sleep(1)
    sense.clear()
    return "Hello World!"

if __name__ == "__main__":
    app.run(host='0.0.0.0')
